export interface Post {
    id: string
    title: string
    slug: string
    content: string
    excerpt: string
    coverImage: string
    published: boolean
    publishedAt: string | null
    views?: number
    shares?: number
    createdAt: string
    updatedAt: string
}

export type PublicPost = Omit<Post, 'content'> & {
    content?: string
}

export interface CreatePostInput {
    title: string
    content: string
    excerpt: string
    coverImage: string
    published: boolean
}

export interface UpdatePostInput {
    title?: string
    slug?: string
    content?: string
    excerpt?: string
    coverImage?: string
    published?: boolean
}

export interface PostListResponse {
    posts: Post[]
    total: number
}
