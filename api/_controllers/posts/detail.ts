import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ObjectId } from 'mongodb';
import { getDb } from '../../_lib/mongodb';
import { getAuthUser } from '../../_lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { id } = req.query;
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Post ID required' });
  }

  const db = await getDb();

  // GET - Get single post (public for published, auth for drafts)
  if (req.method === 'GET') {
    try {
      let post;
      try {
        post = await db.collection('posts').findOne({ _id: new ObjectId(id) });
      } catch {
        post = await db.collection('posts').findOne({ _id: id as any });
      }

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
      console.error('Get post error:', error);
      return res.status(500).json({ error: 'Failed to get post' });
    }
  }

  // PUT - Update post
  if (req.method === 'PUT') {
    const authUser = await getAuthUser(req);
    if (!authUser) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      let post;
      try {
        post = await db.collection('posts').findOne({ _id: new ObjectId(id) });
      } catch {
        post = await db.collection('posts').findOne({ _id: id as any });
      }

      if (!post) {
        return res.status(404).json({ error: 'Post not found' });
      }

      if (post.userId !== authUser.id) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const updates: any = { ...req.body, updatedAt: new Date() };

      // Handle publish state
      if (updates.published === true && !post.published) {
        updates.publishedAt = new Date();
      } else if (updates.published === false) {
        updates.publishedAt = null;
      }

      // Check slug uniqueness if changing
      if (updates.slug && updates.slug !== post.slug) {
        const existing = await db.collection('posts').findOne({
          userId: authUser.id,
          slug: updates.slug,
          _id: { $ne: post._id },
        });
        if (existing) {
          return res.status(400).json({ error: 'A post with this slug already exists' });
        }
      }

      let query;
      try {
        query = { _id: new ObjectId(id) };
      } catch {
        query = { _id: id as any };
      }

      await db.collection('posts').updateOne(query, { $set: updates });

      const updatedPost = await db.collection('posts').findOne(query);

      return res.status(200).json({
        id: updatedPost!._id,
        userId: updatedPost!.userId,
        title: updatedPost!.title,
        slug: updatedPost!.slug,
        content: updatedPost!.content,
        excerpt: updatedPost!.excerpt,
        coverImage: updatedPost!.coverImage,
        published: updatedPost!.published,
        publishedAt: updatedPost!.publishedAt,
        views: updatedPost!.views || 0,
        shares: updatedPost!.shares || 0,
        createdAt: updatedPost!.createdAt,
        updatedAt: updatedPost!.updatedAt,
      });
    } catch (error) {
      console.error('Update post error:', error);
      return res.status(500).json({ error: 'Failed to update post' });
    }
  }

  // DELETE - Delete post
  if (req.method === 'DELETE') {
    const authUser = await getAuthUser(req);
    if (!authUser) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      let post;
      try {
        post = await db.collection('posts').findOne({ _id: new ObjectId(id) });
      } catch {
        post = await db.collection('posts').findOne({ _id: id as any });
      }

      if (!post) {
        return res.status(404).json({ error: 'Post not found' });
      }

      if (post.userId !== authUser.id) {
        return res.status(403).json({ error: 'Access denied' });
      }

      let query;
      try {
        query = { _id: new ObjectId(id) };
      } catch {
        query = { _id: id as any };
      }

      await db.collection('posts').deleteOne(query);

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('Delete post error:', error);
      return res.status(500).json({ error: 'Failed to delete post' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
