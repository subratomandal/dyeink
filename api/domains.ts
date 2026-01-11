import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from './_lib/mongodb';
import { getAuthUser } from './_lib/auth';

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

  // POST - Add domain
  if (req.method === 'POST') {
    const { domain } = req.body;

    if (!domain) {
      return res.status(400).json({ error: 'Domain is required' });
    }

    try {
      // Check if domain is already in use
      const existing = await db.collection('site_settings').findOne({
        customDomain: { $regex: new RegExp(`^${domain}$`, 'i') },
        userId: { $ne: authUser.id },
      });

      if (existing) {
        return res.status(400).json({ error: 'Domain already in use' });
      }

      // Add domain to Vercel
      const vercelRes = await fetch(
        `https://api.vercel.com/v10/projects/${process.env.VERCEL_PROJECT_ID}/domains${process.env.VERCEL_TEAM_ID ? `?teamId=${process.env.VERCEL_TEAM_ID}` : ''}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.VERCEL_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name: domain.toLowerCase() }),
        }
      );

      const vercelData = await vercelRes.json();

      // Update settings
      await db.collection('site_settings').updateOne(
        { userId: authUser.id },
        {
          $set: {
            customDomain: domain.toLowerCase(),
            domainStatus: vercelData.verified ? 'verified' : 'pending',
            updatedAt: new Date(),
          },
        }
      );

      return res.status(200).json({
        success: true,
        verified: vercelData.verified,
        verification: vercelData.verification,
      });
    } catch (error) {
      console.error('Add domain error:', error);
      return res.status(500).json({ error: 'Failed to add domain' });
    }
  }

  // GET - Get domain status
  if (req.method === 'GET') {
    try {
      const settings = await db.collection('site_settings').findOne({ userId: authUser.id });

      if (!settings || !settings.customDomain) {
        return res.status(200).json({ hasDomain: false });
      }

      // Check status with Vercel
      const vercelRes = await fetch(
        `https://api.vercel.com/v9/projects/${process.env.VERCEL_PROJECT_ID}/domains/${settings.customDomain}${process.env.VERCEL_TEAM_ID ? `?teamId=${process.env.VERCEL_TEAM_ID}` : ''}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.VERCEL_TOKEN}`,
          },
        }
      );

      const vercelData = await vercelRes.json();

      if (vercelData.verified && settings.domainStatus !== 'active') {
        await db.collection('site_settings').updateOne(
          { userId: authUser.id },
          { $set: { domainStatus: 'active', updatedAt: new Date() } }
        );
      }

      return res.status(200).json({
        hasDomain: true,
        domain: settings.customDomain,
        status: settings.domainStatus,
        verified: vercelData.verified,
        verification: vercelData.verification,
      });
    } catch (error) {
      console.error('Get domain status error:', error);
      return res.status(500).json({ error: 'Failed to get domain status' });
    }
  }

  // DELETE - Remove domain
  if (req.method === 'DELETE') {
    try {
      const settings = await db.collection('site_settings').findOne({ userId: authUser.id });

      if (!settings || !settings.customDomain) {
        return res.status(404).json({ error: 'No custom domain configured' });
      }

      // Remove from Vercel
      try {
        await fetch(
          `https://api.vercel.com/v9/projects/${process.env.VERCEL_PROJECT_ID}/domains/${settings.customDomain}${process.env.VERCEL_TEAM_ID ? `?teamId=${process.env.VERCEL_TEAM_ID}` : ''}`,
          {
            method: 'DELETE',
            headers: {
              Authorization: `Bearer ${process.env.VERCEL_TOKEN}`,
            },
          }
        );
      } catch (e) {
        console.error('Failed to remove from Vercel:', e);
      }

      // Update settings
      await db.collection('site_settings').updateOne(
        { userId: authUser.id },
        {
          $set: {
            customDomain: null,
            domainStatus: null,
            updatedAt: new Date(),
          },
        }
      );

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('Remove domain error:', error);
      return res.status(500).json({ error: 'Failed to remove domain' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
