import { supabase } from '../lib/supabase'
import { Post, CreatePostInput, UpdatePostInput } from '../types'
import { compressImage } from '../utils/imageCompression'

export const postService = {
    async uploadImage(file: File): Promise<string | null> {
        try {
            const compressedFile = await compressImage(file)
            const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.webp`
            const filePath = `${fileName}`

            const { error: uploadError } = await supabase.storage
                .from('post-images')
                .upload(filePath, compressedFile)

            if (uploadError) {
                console.error('Error uploading image:', uploadError)
                throw uploadError
            }

            const { data } = supabase.storage
                .from('post-images')
                .getPublicUrl(filePath)

            return data.publicUrl
        } catch (error) {
            console.error('Upload failed:', error)
            return null
        }
    },

    async createPost(post: CreatePostInput): Promise<Post | null> {
        const slug = post.title
            .toLowerCase()
            .replace(/ /g, '-')
            .replace(/[^\w-]+/g, '')
        const { data: userData } = await supabase.auth.getUser()
        const userId = userData.user?.id
        if (!userId) {
            throw new Error('User not authenticated. Please log in again.')
        }
        const { data, error } = await supabase
            .from('posts')
            .insert({
                title: post.title,
                content: post.content,
                excerpt: post.excerpt,
                slug: slug,
                cover_image: post.coverImage,
                published: post.published,
                published_at: post.published ? new Date().toISOString() : null,
                user_id: userId
            })
            .select()
        if (error) {
            console.error('Error creating post:', error)
            throw error
        }
        if (!data || data.length === 0) {
            throw new Error('Failed to create post: No data returned')
        }
        const newPost = data[0]
        supabase.functions.invoke('broadcast-post', {
            body: { postId: newPost.id }
        }).catch(err => console.error('Failed to trigger email broadcast:', err))
        return mapResponseToPost(newPost)
    },
    async updatePost(id: number, post: UpdatePostInput): Promise<Post | null> {
        const updates: any = {
            ...post,
            updated_at: new Date().toISOString()
        }
        if (post.published === true) {
            updates.published = true
            updates.published_at = new Date().toISOString()
        } else if (post.published === false) {
            updates.published = false
            updates.published_at = null
        }
        if (post.coverImage !== undefined) updates.cover_image = post.coverImage
        if (post.published !== undefined) updates.published = post.published
        delete updates.coverImage
        const { data, error } = await supabase
            .from('posts')
            .update(updates)
            .eq('id', id)
            .select()
        if (error) {
            console.error('Error updating post:', error)
            throw error
        }
        if (!data || data.length === 0) {
            console.error('Update returned no rows. Possible RLS violation or invalid ID.')
            throw new Error('Post not found or permission denied.')
        }
        return mapResponseToPost(data[0])
    },
    async getPostById(id: string): Promise<Post | null> {
        const { data, error } = await supabase
            .from('posts')
            .select('*')
            .eq('id', id)
            .single()
        if (error) {
            console.error('Error fetching post by ID:', error)
            return null
        }
        return mapResponseToPost(data)
    },
    async getPostBySlug(slug: string): Promise<Post | null> {
        const { data, error } = await supabase
            .from('posts')
            .select('*')
            .eq('slug', slug)
            .single()
        if (error) {
            console.error('Error fetching post:', error)
            return null
        }
        return mapResponseToPost(data)
    },
    async getPosts(options: { userId?: string, publishedOnly?: boolean } = {}): Promise<Post[]> {
        let query = supabase
            .from('posts')
            .select('*')
            .order('created_at', { ascending: false })
        if (options.userId) {
            query = query.eq('user_id', options.userId)
        } else {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                query = query.eq('user_id', user.id)
            } else {
                console.warn('getPosts called without context (no userId and no session). Returning empty.')
                return []
            }
        }
        if (options.publishedOnly) {
            query = query.eq('published', true).order('published_at', { ascending: false })
        }
        const { data, error } = await query
        if (error) {
            console.error('Error fetching posts:', error)
            return []
        }
        return data.map(mapResponseToPost)
    },
    async deletePost(id: number): Promise<void> {
        const { error } = await supabase
            .from('posts')
            .delete()
            .eq('id', id)
        if (error) throw error
    },
    async deleteAllPosts(): Promise<void> {
        const { data: userData } = await supabase.auth.getUser()
        if (!userData.user) return
        const { error } = await supabase
            .from('posts')
            .delete()
            .eq('user_id', userData.user.id)
        if (error) {
            console.error('Error deleting all posts:', error)
            throw error
        }
    }
}
const mapResponseToPost = (data: any): Post => {
    return {
        id: data.id,
        title: data.title,
        slug: data.slug,
        content: data.content,
        excerpt: data.excerpt,
        coverImage: data.cover_image,
        published: data.published,
        publishedAt: data.published_at,
        userId: data.user_id,
        views: data.views,
        shares: data.shares,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        user: data.user
    }
}

