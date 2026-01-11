import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ObjectId } from 'mongodb';
import { getDb } from '../../_lib/mongodb';
import { getAuthUser } from '../../_lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const authUser = await getAuthUser(req);
  if (!authUser) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const db = await getDb();

  // GET - Get subscribers
  if (req.method === 'GET') {
    try {
      const settings = await db.collection('site_settings').findOne({ userId: authUser.id });

      if (!settings) {
        return res.status(200).json({ subscribers: [], total: 0 });
      }

      const subscribers = await db
        .collection('subscribers')
        .find({ blogId: settings._id, active: true })
        .sort({ createdAt: -1 })
        .toArray();

      return res.status(200).json({
        subscribers: subscribers.map((s) => ({
          id: s._id,
          email: s.email,
          verified: s.verified,
          createdAt: s.createdAt,
        })),
        total: subscribers.length,
      });
    } catch (error) {
      console.error('Get subscribers error:', error);
      return res.status(500).json({ error: 'Failed to get subscribers' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
