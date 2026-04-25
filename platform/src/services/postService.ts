import apiClient from '@/lib/apiClient'
import { Post, PublicPost, CreatePostInput, UpdatePostInput } from '@/types'
import { compressImage } from '@/utils/imageCompression'

const PUBLIC_CONTENT_BASE = (import.meta.env.VITE_PUBLIC_CONTENT_URL || '').replace(/\/$/, '')
const postCache = new Map<string, Promise<Post | null>>()
let publicPostsCache: Promise<PublicPost[]> | null = null

async function getPublicJson<T>(path: string): Promise<T> {
    const response = await fetch(`${PUBLIC_CONTENT_BASE}${path}`, {
        headers: { Accept: 'application/json' },
    })
    if (!response.ok) throw new Error(`Public content request failed: ${response.status}`)
    return response.json()
}

async function getPostBySlugFromApi(slug: string): Promise<Post | null> {
    try {
        const response = await apiClient.get(`/posts/slug/${slug}`)
        return response.data
    } catch {
        return null
    }
}

function clearPublicCaches() {
    publicPostsCache = null
    postCache.clear()
}

function loadPublicPost(slug: string) {
    return (async () => {
        try {
            return await getPublicJson<Post>(`/public/posts/${encodeURIComponent(slug)}.json`)
        } catch {
            return getPostBySlugFromApi(slug)
        }
    })()
}

function ensurePublicPostCached(slug: string) {
    if (!postCache.has(slug)) {
        const request = loadPublicPost(slug).then(
            (post) => {
                if (!post) postCache.delete(slug)
                return post
            },
            (error) => {
                postCache.delete(slug)
                throw error
            },
        )
        postCache.set(slug, request)
    }
    return postCache.get(slug)!
}

function loadPublicPosts() {
    return (async () => {
        try {
            const response = await getPublicJson<{ posts?: PublicPost[] }>('/public/posts.json')
            return response.posts || []
        } catch {
            try {
                const response = await apiClient.get('/posts/public')
                return response.data.posts || []
            } catch {
                publicPostsCache = null
                return []
            }
        }
    })()
}

export const postService = {
    async uploadImage(file: File): Promise<string | null> {
        try {
            const compressed = await compressImage(file)
            const formData = new FormData()
            formData.append('file', compressed)
            const response = await apiClient.post('/upload', formData)
            return response.data.url
        } catch (error) {
            console.error('Upload failed:', error)
            return null
        }
    },

    async createPost(post: CreatePostInput): Promise<Post> {
        const response = await apiClient.post('/posts', {
            title: post.title,
            content: post.content,
            excerpt: post.excerpt,
            coverImage: post.coverImage,
            published: post.published,
        })
        clearPublicCaches()
        return response.data
    },

    async updatePost(id: string, post: UpdatePostInput): Promise<Post> {
        const response = await apiClient.put(`/posts/${id}`, post)
        clearPublicCaches()
        return response.data
    },

    async getPostById(id: string): Promise<Post | null> {
        try {
            const response = await apiClient.get(`/posts/${id}`)
            return response.data
        } catch {
            return null
        }
    },

    async getPostBySlug(slug: string): Promise<Post | null> {
        return getPostBySlugFromApi(slug)
    },

    async getPosts(): Promise<Post[]> {
        try {
            const response = await apiClient.get('/posts')
            return response.data.posts || []
        } catch {
            return []
        }
    },

    async getPublicPosts(): Promise<PublicPost[]> {
        publicPostsCache ??= loadPublicPosts()
        return publicPostsCache
    },

    prefetchPublicPosts(): void {
        publicPostsCache ??= loadPublicPosts()
    },

    async getPublicPostBySlug(slug: string): Promise<Post | null> {
        return ensurePublicPostCached(slug)
    },

    prefetchPublicPost(slug: string): void {
        ensurePublicPostCached(slug).catch(() => {})
    },

    async getPublicPostsWithContentFallback(): Promise<Post[]> {
        try {
            const response = await apiClient.get('/posts/public')
            return response.data.posts || []
        } catch {
            return []
        }
    },

    async deletePost(id: string): Promise<void> {
        await apiClient.delete(`/posts/${id}`)
        clearPublicCaches()
    },

    async deleteAllPosts(): Promise<void> {
        await apiClient.delete('/posts')
        clearPublicCaches()
    },
}

export default postService
