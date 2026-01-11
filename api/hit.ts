import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ObjectId } from 'mongodb';
import { getDb } from './_lib/mongodb';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id, type } = req.query;

  if (!id || !type || !['view', 'share'].includes(type as string)) {
    return res.status(400).json({ error: 'Invalid parameters' });
  }

  try {
    const db = await getDb();
    const updateField = type === 'view' ? 'views' : 'shares';

    let query;
    try {
      query = { _id: new ObjectId(id as string) };
    } catch {
      query = { _id: id as any };
    }

    // Update post counter
    await db.collection('posts').updateOne(query, { $inc: { [updateField]: 1 } });

    // Update daily stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await db.collection('daily_post_stats').updateOne(
      { postId: id, date: today },
      { $inc: { [updateField]: 1 } },
      { upsert: true }
    );

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Track event error:', error);
    return res.status(500).json({ error: 'Failed to track event' });
  }
}
