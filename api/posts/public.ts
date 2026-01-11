import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from '../_lib/mongodb';

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

  const { subdomain, customDomain } = req.query;

  try {
    const db = await getDb();

    let settings;
    if (customDomain) {
      settings = await db.collection('site_settings').findOne({
        customDomain: { $regex: new RegExp(`^${customDomain}$`, 'i') },
      });
    } else if (subdomain) {
      settings = await db.collection('site_settings').findOne({ subdomain });
    }

    if (!settings) {
      return res.status(404).json({ error: 'Blog not found' });
    }

    const posts = await db
      .collection('posts')
      .find({ userId: settings.userId, published: true })
      .sort({ publishedAt: -1 })
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
    });
  } catch (error) {
    console.error('Get public posts error:', error);
    return res.status(500).json({ error: 'Failed to get posts' });
  }
}
