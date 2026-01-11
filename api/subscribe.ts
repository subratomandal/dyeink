import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from './_lib/mongodb';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, blogId, subdomain, customDomain } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  try {
    const db = await getDb();

    // Find the blog
    let settings;
    if (blogId) {
      settings = await db.collection('site_settings').findOne({ _id: blogId });
    } else if (subdomain) {
      settings = await db.collection('site_settings').findOne({ subdomain });
    } else if (customDomain) {
      settings = await db.collection('site_settings').findOne({
        customDomain: { $regex: new RegExp(`^${customDomain}$`, 'i') },
      });
    }

    if (!settings) {
      return res.status(404).json({ error: 'Blog not found' });
    }

    // Check if already subscribed
    const existing = await db.collection('subscribers').findOne({
      email: email.toLowerCase(),
      blogId: settings._id,
    });

    if (existing) {
      if (!existing.active) {
        // Reactivate subscription
        await db.collection('subscribers').updateOne(
          { _id: existing._id },
          { $set: { active: true, updatedAt: new Date() } }
        );
        return res.status(200).json({ ok: true, message: 'Subscription reactivated' });
      }
      return res.status(200).json({ ok: true, message: 'Already subscribed' });
    }

    // Create new subscriber
    await db.collection('subscribers').insertOne({
      email: email.toLowerCase(),
      blogId: settings._id,
      active: true,
      verified: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return res.status(200).json({ ok: true, message: 'Subscribed successfully' });
  } catch (error) {
    console.error('Subscribe error:', error);
    return res.status(500).json({ error: 'Failed to subscribe' });
  }
}
