import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from './_lib/mongodb';
import { getAuthUser } from './_lib/auth';

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

  const authUser = await getAuthUser(req);
  if (!authUser) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const db = await getDb();

    // Get all user's posts
    const posts = await db.collection('posts').find({ userId: authUser.id }).toArray();

    // Calculate totals
    const totalViews = posts.reduce((sum, p) => sum + (p.views || 0), 0);
    const totalShares = posts.reduce((sum, p) => sum + (p.shares || 0), 0);

    // Get subscriber count
    const settings = await db.collection('site_settings').findOne({ userId: authUser.id });
    let totalSubscribers = 0;
    if (settings) {
      totalSubscribers = await db.collection('subscribers').countDocuments({
        blogId: settings._id,
        active: true,
      });
    }

    // Get last 7 days of stats
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const postIds = posts.map((p) => p._id.toString());

    const dailyStats = await db
      .collection('daily_post_stats')
      .aggregate([
        {
          $match: {
            postId: { $in: postIds },
            date: { $gte: sevenDaysAgo },
          },
        },
        {
          $group: {
            _id: '$date',
            views: { $sum: '$views' },
            shares: { $sum: '$shares' },
          },
        },
        {
          $sort: { _id: 1 },
        },
      ])
      .toArray();

    // Fill in missing days
    const graphData = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(sevenDaysAgo);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];

      const stat = dailyStats.find(
        (s) => new Date(s._id).toISOString().split('T')[0] === dateStr
      );

      graphData.push({
        date: dateStr,
        views: stat?.views || 0,
        shares: stat?.shares || 0,
      });
    }

    return res.status(200).json({
      totalViews,
      totalShares,
      totalSubscribers,
      graphData,
    });
  } catch (error) {
    console.error('Get stats error:', error);
    return res.status(500).json({ error: 'Failed to get stats' });
  }
}
