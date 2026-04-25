import apiClient from '@/lib/apiClient'
import { Post, CreatePostInput, UpdatePostInput } from '@/types'
import { compressImage } from '@/utils/imageCompression'

export const postService = {
    async uploadImage(file: File): Promise<string | null> {
        try {
            const compressed = await compressImage(file)
            const formData = new FormData()
            formData.append('file', compressed)
            const response = await apiClient.post('/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            })
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
        return response.data
    },

    async updatePost(id: string, post: UpdatePostInput): Promise<Post> {
        const response = await apiClient.put(`/posts/${id}`, post)
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
        try {
            const response = await apiClient.get(`/posts/slug/${slug}`)
            return response.data
        } catch {
            return null
        }
    },

    async getPosts(): Promise<Post[]> {
        try {
            const response = await apiClient.get('/posts')
            return response.data.posts || []
        } catch {
            return []
        }
    },

    async getPublicPosts(): Promise<Post[]> {
        try {
            const response = await apiClient.get('/posts/public')
            return response.data.posts || []
        } catch {
            return []
        }
    },

    async deletePost(id: string): Promise<void> {
        await apiClient.delete(`/posts/${id}`)
    },

    async deleteAllPosts(): Promise<void> {
        await apiClient.delete('/posts')
    },
}

export default postService
