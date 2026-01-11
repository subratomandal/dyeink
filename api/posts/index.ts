import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ObjectId } from 'mongodb';
import { getDb } from '../_lib/mongodb';
import { getAuthUser } from '../_lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const authUser = await getAuthUser(req);
  if (!authUser) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const db = await getDb();

  // GET - List posts
  if (req.method === 'GET') {
    try {
      const posts = await db
        .collection('posts')
        .find({ userId: authUser.id })
        .sort({ createdAt: -1 })
        .toArray();

      return res.status(200).json({
        posts: posts.map((p) => ({
          id: p._id,
          userId: p.userId,
          title: p.title,
          slug: p.slug,
          content: p.content,
          excerpt: p.excerpt,
          coverImage: p.coverImage,
          published: p.published,
          publishedAt: p.publishedAt,
          views: p.views || 0,
          shares: p.shares || 0,
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
        })),
        total: posts.length,
      });
    } catch (error) {
      console.error('Get posts error:', error);
      return res.status(500).json({ error: 'Failed to get posts' });
    }
  }

  // POST - Create post
  if (req.method === 'POST') {
    try {
      const { title, slug, content, excerpt, coverImage, published } = req.body;

      // Check slug uniqueness
      const existing = await db.collection('posts').findOne({
        userId: authUser.id,
        slug,
      });

      if (existing) {
        return res.status(400).json({ error: 'A post with this slug already exists' });
      }

      const post = {
        userId: authUser.id,
        title,
        slug,
        content: content || '',
        excerpt: excerpt || '',
        coverImage: coverImage || '',
        published: published || false,
        publishedAt: published ? new Date() : null,
        views: 0,
        shares: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await db.collection('posts').insertOne(post);

      return res.status(201).json({
        id: result.insertedId,
        ...post,
      });
    } catch (error) {
      console.error('Create post error:', error);
      return res.status(500).json({ error: 'Failed to create post' });
    }
  }

  // DELETE - Delete all posts
  if (req.method === 'DELETE') {
    try {
      await db.collection('posts').deleteMany({ userId: authUser.id });
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('Delete posts error:', error);
      return res.status(500).json({ error: 'Failed to delete posts' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
