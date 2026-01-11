import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ObjectId } from 'mongodb';
import { getDb } from '../_lib/mongodb';
import { getAuthUser } from '../_lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authUser = await getAuthUser(req);
  if (!authUser) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Subscriber ID required' });
  }

  try {
    const db = await getDb();

    // Verify ownership
    const settings = await db.collection('site_settings').findOne({ userId: authUser.id });

    if (!settings) {
      return res.status(404).json({ error: 'Blog not found' });
    }

    let query;
    try {
      query = { _id: new ObjectId(id), blogId: settings._id };
    } catch {
      query = { _id: id as any, blogId: settings._id };
    }

    const subscriber = await db.collection('subscribers').findOne(query);

    if (!subscriber) {
      return res.status(404).json({ error: 'Subscriber not found' });
    }

    await db.collection('subscribers').deleteOne(query);

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Delete subscriber error:', error);
    return res.status(500).json({ error: 'Failed to delete subscriber' });
  }
}
