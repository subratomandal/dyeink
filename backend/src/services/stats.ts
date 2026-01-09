import { Post, DailyPostStats, Subscriber, SiteSettings } from '../models/index.js';
import mongoose from 'mongoose';

export async function trackEvent(
  postId: string,
  type: 'view' | 'share'
): Promise<void> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Update post counters
    const updateField = type === 'view' ? 'views' : 'shares';
    await Post.findByIdAndUpdate(
      postId,
      { $inc: { [updateField]: 1 } },
      { session }
    );

    // Update or create daily stats
    await DailyPostStats.findOneAndUpdate(
      { postId: new mongoose.Types.ObjectId(postId), date: today },
      { $inc: { [updateField]: 1 } },
      { upsert: true, session }
    );

    await session.commitTransaction();
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}

export interface BasicStats {
  totalViews: number;
  totalShares: number;
  totalSubscribers: number;
  graphData: {
    date: string;
    views: number;
    shares: number;
  }[];
}

export async function getBasicStats(userId: string): Promise<BasicStats> {
  // Get all user's posts
  const posts = await Post.find({ userId });
  const postIds = posts.map((p) => p._id);

  // Calculate totals
  const totalViews = posts.reduce((sum, p) => sum + (p.views || 0), 0);
  const totalShares = posts.reduce((sum, p) => sum + (p.shares || 0), 0);

  // Get subscriber count
  const settings = await SiteSettings.findOne({ userId });
  let totalSubscribers = 0;
  if (settings) {
    totalSubscribers = await Subscriber.countDocuments({
      blogId: settings._id,
      active: true,
    });
  }

  // Get last 7 days of stats
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const dailyStats = await DailyPostStats.aggregate([
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
  ]);

  // Fill in missing days
  const graphData: BasicStats['graphData'] = [];
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

  return {
    totalViews,
    totalShares,
    totalSubscribers,
    graphData,
  };
}
