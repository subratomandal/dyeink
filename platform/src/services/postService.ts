import apiClient from '../lib/apiClient';
import { Post, CreatePostInput, UpdatePostInput } from '../types';
import { compressImage } from '../utils/imageCompression';

export const postService = {
  async uploadImage(file: File): Promise<string | null> {
    try {
      const compressedFile = await compressImage(file);

      const formData = new FormData();
      formData.append('file', compressedFile);

      const response = await apiClient.post('/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return response.data.url;
    } catch (error) {
      console.error('Upload failed:', error);
      return null;
    }
  },

  async createPost(post: CreatePostInput): Promise<Post | null> {
    const slug = post.title
      .toLowerCase()
      .replace(/ /g, '-')
      .replace(/[^\w-]+/g, '');

    const response = await apiClient.post('/posts', {
      title: post.title,
      slug,
      content: post.content,
      excerpt: post.excerpt,
      coverImage: post.coverImage,
      published: post.published,
    });

    return mapResponseToPost(response.data);
  },

  async updatePost(id: number | string, post: UpdatePostInput): Promise<Post | null> {
    const updates: any = { ...post };

    const response = await apiClient.put(`/posts/${id}`, updates);

    return mapResponseToPost(response.data);
  },

  async getPostById(id: string): Promise<Post | null> {
    try {
      const response = await apiClient.get(`/posts/${id}`);
      return mapResponseToPost(response.data);
    } catch (error) {
      console.error('Error fetching post by ID:', error);
      return null;
    }
  },

  async getPostBySlug(slug: string, userId?: string): Promise<Post | null> {
    try {
      const params = userId ? `?userId=${userId}` : '';
      const response = await apiClient.get(`/posts/slug/${slug}${params}`);
      return mapResponseToPost(response.data);
    } catch (error) {
      console.error('Error fetching post:', error);
      return null;
    }
  },

  async getPosts(options: { userId?: string; publishedOnly?: boolean } = {}): Promise<Post[]> {
    try {
      let url = '/posts';
      const params = new URLSearchParams();

      if (options.publishedOnly) {
        params.append('published', 'true');
      }

      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const response = await apiClient.get(url);
      return (response.data.posts || []).map(mapResponseToPost);
    } catch (error) {
      console.error('Error fetching posts:', error);
      return [];
    }
  },

  async getPublicPosts(options: { subdomain?: string; customDomain?: string } = {}): Promise<Post[]> {
    try {
      const params = new URLSearchParams();
      if (options.subdomain) params.append('subdomain', options.subdomain);
      if (options.customDomain) params.append('customDomain', options.customDomain);

      const response = await apiClient.get(`/posts/public?${params.toString()}`);
      return (response.data.posts || []).map(mapResponseToPost);
    } catch (error) {
      console.error('Error fetching public posts:', error);
      return [];
    }
  },

  async deletePost(id: number | string): Promise<void> {
    await apiClient.delete(`/posts/${id}`);
  },

  async deleteAllPosts(): Promise<void> {
    await apiClient.delete('/posts');
  },
};

const mapResponseToPost = (data: any): Post => {
  return {
    id: data._id || data.id,
    title: data.title,
    slug: data.slug,
    content: data.content,
    excerpt: data.excerpt,
    coverImage: data.coverImage || data.cover_image,
    published: data.published,
    publishedAt: data.publishedAt || data.published_at,
    userId: data.userId || data.user_id,
    views: data.views,
    shares: data.shares,
    createdAt: data.createdAt || data.created_at,
    updatedAt: data.updatedAt || data.updated_at,
    user: data.user,
  };
};

export default postService;
