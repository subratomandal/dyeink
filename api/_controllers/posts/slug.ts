import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from '../../_lib/mongodb';
import { getAuthUser } from '../../_lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { slug, userId } = req.query;

  if (!slug || typeof slug !== 'string') {
    return res.status(400).json({ error: 'Slug required' });
  }

  try {
    const db = await getDb();

    const query: any = { slug };
    if (userId) {
      query.userId = userId;
    }

    const post = await db.collection('posts').findOne(query);

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Check access for unpublished posts
    if (!post.published) {
      const authUser = await getAuthUser(req);
      if (!authUser || authUser.id !== post.userId) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    return res.status(200).json({
      id: post._id,
      userId: post.userId,
      title: post.title,
      slug: post.slug,
      content: post.content,
      excerpt: post.excerpt,
      coverImage: post.coverImage,
      published: post.published,
      publishedAt: post.publishedAt,
      views: post.views || 0,
      shares: post.shares || 0,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
    });
  } catch (error) {
    console.error('Get post by slug error:', error);
    return res.status(500).json({ error: 'Failed to get post' });
  }
}
