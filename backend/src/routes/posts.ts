import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { Post, SiteSettings } from '../models/index.js';
import { authMiddleware, optionalAuthMiddleware } from '../middleware/auth.js';

interface CreatePostBody {
  title: string;
  slug: string;
  content?: string;
  excerpt?: string;
  coverImage?: string;
  published?: boolean;
}

interface UpdatePostBody {
  title?: string;
  slug?: string;
  content?: string;
  excerpt?: string;
  coverImage?: string;
  published?: boolean;
}

interface GetPostsQuery {
  page?: number;
  limit?: number;
  published?: boolean;
  userId?: string;
}

export async function postsRoutes(fastify: FastifyInstance): Promise<void> {
  // Create post
  fastify.post<{ Body: CreatePostBody }>(
    '/posts',
    { preHandler: [authMiddleware] },
    async (request, reply) => {
      try {
        if (!request.user) {
          return reply.code(401).send({ error: 'Not authenticated' });
        }

        const { title, slug, content, excerpt, coverImage, published } = request.body;

        // Check if slug already exists for this user
        const existingPost = await Post.findOne({
          userId: request.user.id,
          slug,
        });

        if (existingPost) {
          return reply.code(400).send({ error: 'A post with this slug already exists' });
        }

        const post = await Post.create({
          userId: request.user.id,
          title,
          slug,
          content: content || '',
          excerpt: excerpt || '',
          coverImage: coverImage || '',
          published: published || false,
          publishedAt: published ? new Date() : null,
        });

        return {
          id: post._id,
          userId: post.userId,
          title: post.title,
          slug: post.slug,
          content: post.content,
          excerpt: post.excerpt,
          coverImage: post.coverImage,
          published: post.published,
          publishedAt: post.publishedAt,
          views: post.views,
          shares: post.shares,
          createdAt: post.createdAt,
          updatedAt: post.updatedAt,
        };
      } catch (error: any) {
        console.error('Create post error:', error);
        reply.code(500).send({ error: 'Failed to create post' });
      }
    }
  );

  // Get user's posts
  fastify.get<{ Querystring: GetPostsQuery }>(
    '/posts',
    { preHandler: [authMiddleware] },
    async (request, reply) => {
      try {
        if (!request.user) {
          return reply.code(401).send({ error: 'Not authenticated' });
        }

        const { page = 1, limit = 50, published } = request.query;
        const skip = (page - 1) * limit;

        const query: any = { userId: request.user.id };
        if (typeof published === 'boolean') {
          query.published = published;
        }

        const [posts, total] = await Promise.all([
          Post.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit),
          Post.countDocuments(query),
        ]);

        return {
          posts: posts.map((post) => ({
            id: post._id,
            userId: post.userId,
            title: post.title,
            slug: post.slug,
            content: post.content,
            excerpt: post.excerpt,
            coverImage: post.coverImage,
            published: post.published,
            publishedAt: post.publishedAt,
            views: post.views,
            shares: post.shares,
            createdAt: post.createdAt,
            updatedAt: post.updatedAt,
          })),
          total,
          page,
          limit,
        };
      } catch (error: any) {
        console.error('Get posts error:', error);
        reply.code(500).send({ error: 'Failed to get posts' });
      }
    }
  );

  // Get public posts by subdomain or custom domain
  fastify.get<{ Querystring: { subdomain?: string; customDomain?: string } }>(
    '/posts/public',
    async (request, reply) => {
      try {
        const { subdomain, customDomain } = request.query;

        let settings;
        if (customDomain) {
          settings = await SiteSettings.findOne({
            customDomain: { $regex: new RegExp(`^${customDomain}$`, 'i') },
          });
        } else if (subdomain) {
          settings = await SiteSettings.findOne({ subdomain });
        }

        if (!settings) {
          return reply.code(404).send({ error: 'Blog not found' });
        }

        const posts = await Post.find({
          userId: settings.userId,
          published: true,
        }).sort({ publishedAt: -1 });

        return {
          posts: posts.map((post) => ({
            id: post._id,
            userId: post.userId,
            title: post.title,
            slug: post.slug,
            content: post.content,
            excerpt: post.excerpt,
            coverImage: post.coverImage,
            published: post.published,
            publishedAt: post.publishedAt,
            views: post.views,
            shares: post.shares,
            createdAt: post.createdAt,
            updatedAt: post.updatedAt,
          })),
        };
      } catch (error: any) {
        console.error('Get public posts error:', error);
        reply.code(500).send({ error: 'Failed to get posts' });
      }
    }
  );

  // Get single post by ID
  fastify.get<{ Params: { id: string } }>(
    '/posts/:id',
    { preHandler: [optionalAuthMiddleware] },
    async (request, reply) => {
      try {
        const { id } = request.params;
        const post = await Post.findById(id);

        if (!post) {
          return reply.code(404).send({ error: 'Post not found' });
        }

        // Check access
        if (!post.published && (!request.user || request.user.id !== post.userId)) {
          return reply.code(403).send({ error: 'Access denied' });
        }

        return {
          id: post._id,
          userId: post.userId,
          title: post.title,
          slug: post.slug,
          content: post.content,
          excerpt: post.excerpt,
          coverImage: post.coverImage,
          published: post.published,
          publishedAt: post.publishedAt,
          views: post.views,
          shares: post.shares,
          createdAt: post.createdAt,
          updatedAt: post.updatedAt,
        };
      } catch (error: any) {
        console.error('Get post error:', error);
        reply.code(500).send({ error: 'Failed to get post' });
      }
    }
  );

  // Get post by slug
  fastify.get<{ Params: { slug: string }; Querystring: { userId?: string } }>(
    '/posts/slug/:slug',
    { preHandler: [optionalAuthMiddleware] },
    async (request, reply) => {
      try {
        const { slug } = request.params;
        const { userId } = request.query;

        const query: any = { slug };
        if (userId) {
          query.userId = userId;
        }

        const post = await Post.findOne(query);

        if (!post) {
          return reply.code(404).send({ error: 'Post not found' });
        }

        // Check access
        if (!post.published && (!request.user || request.user.id !== post.userId)) {
          return reply.code(403).send({ error: 'Access denied' });
        }

        return {
          id: post._id,
          userId: post.userId,
          title: post.title,
          slug: post.slug,
          content: post.content,
          excerpt: post.excerpt,
          coverImage: post.coverImage,
          published: post.published,
          publishedAt: post.publishedAt,
          views: post.views,
          shares: post.shares,
          createdAt: post.createdAt,
          updatedAt: post.updatedAt,
        };
      } catch (error: any) {
        console.error('Get post by slug error:', error);
        reply.code(500).send({ error: 'Failed to get post' });
      }
    }
  );

  // Update post
  fastify.put<{ Params: { id: string }; Body: UpdatePostBody }>(
    '/posts/:id',
    { preHandler: [authMiddleware] },
    async (request, reply) => {
      try {
        if (!request.user) {
          return reply.code(401).send({ error: 'Not authenticated' });
        }

        const { id } = request.params;
        const updates = request.body;

        const post = await Post.findById(id);

        if (!post) {
          return reply.code(404).send({ error: 'Post not found' });
        }

        if (post.userId !== request.user.id) {
          return reply.code(403).send({ error: 'Access denied' });
        }

        // Check slug uniqueness if changing
        if (updates.slug && updates.slug !== post.slug) {
          const existingPost = await Post.findOne({
            userId: request.user.id,
            slug: updates.slug,
            _id: { $ne: id },
          });

          if (existingPost) {
            return reply.code(400).send({ error: 'A post with this slug already exists' });
          }
        }

        // Handle publish state
        if (updates.published && !post.published) {
          (updates as any).publishedAt = new Date();
        } else if (updates.published === false) {
          (updates as any).publishedAt = null;
        }

        const updatedPost = await Post.findByIdAndUpdate(id, updates, {
          new: true,
        });

        if (!updatedPost) {
          return reply.code(404).send({ error: 'Post not found' });
        }

        return {
          id: updatedPost._id,
          userId: updatedPost.userId,
          title: updatedPost.title,
          slug: updatedPost.slug,
          content: updatedPost.content,
          excerpt: updatedPost.excerpt,
          coverImage: updatedPost.coverImage,
          published: updatedPost.published,
          publishedAt: updatedPost.publishedAt,
          views: updatedPost.views,
          shares: updatedPost.shares,
          createdAt: updatedPost.createdAt,
          updatedAt: updatedPost.updatedAt,
        };
      } catch (error: any) {
        console.error('Update post error:', error);
        reply.code(500).send({ error: 'Failed to update post' });
      }
    }
  );

  // Delete post
  fastify.delete<{ Params: { id: string } }>(
    '/posts/:id',
    { preHandler: [authMiddleware] },
    async (request, reply) => {
      try {
        if (!request.user) {
          return reply.code(401).send({ error: 'Not authenticated' });
        }

        const { id } = request.params;
        const post = await Post.findById(id);

        if (!post) {
          return reply.code(404).send({ error: 'Post not found' });
        }

        if (post.userId !== request.user.id) {
          return reply.code(403).send({ error: 'Access denied' });
        }

        await Post.findByIdAndDelete(id);

        return { success: true };
      } catch (error: any) {
        console.error('Delete post error:', error);
        reply.code(500).send({ error: 'Failed to delete post' });
      }
    }
  );

  // Delete all posts
  fastify.delete(
    '/posts',
    { preHandler: [authMiddleware] },
    async (request, reply) => {
      try {
        if (!request.user) {
          return reply.code(401).send({ error: 'Not authenticated' });
        }

        await Post.deleteMany({ userId: request.user.id });

        return { success: true };
      } catch (error: any) {
        console.error('Delete all posts error:', error);
        reply.code(500).send({ error: 'Failed to delete posts' });
      }
    }
  );
}
