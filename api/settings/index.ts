import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from '../_lib/mongodb';
import { getAuthUser } from '../_lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const authUser = await getAuthUser(req);
  if (!authUser) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const db = await getDb();

  // GET - Get current user's settings
  if (req.method === 'GET') {
    try {
      let settings = await db.collection('site_settings').findOne({ userId: authUser.id });

      if (!settings) {
        // Create default settings
        const subdomain = `blog-${authUser.id.slice(0, 8)}`;
        settings = {
          userId: authUser.id,
          siteName: authUser.name || 'My Blog',
          siteDescription: '',
          subdomain,
          customDomain: null,
          domainStatus: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        await db.collection('site_settings').insertOne(settings);
      }

      return res.status(200).json({
        id: settings._id,
        userId: settings.userId,
        siteName: settings.siteName,
        siteDescription: settings.siteDescription,
        customDomain: settings.customDomain,
        subdomain: settings.subdomain,
        twitterLink: settings.twitterLink,
        linkedinLink: settings.linkedinLink,
        githubLink: settings.githubLink,
        websiteLink: settings.websiteLink,
        dribbbleLink: settings.dribbbleLink,
        huggingfaceLink: settings.huggingfaceLink,
        leetcodeLink: settings.leetcodeLink,
        newsletterEmail: settings.newsletterEmail,
        domainStatus: settings.domainStatus,
        createdAt: settings.createdAt,
        updatedAt: settings.updatedAt,
      });
    } catch (error) {
      console.error('Get settings error:', error);
      return res.status(500).json({ error: 'Failed to get settings' });
    }
  }

  // PUT - Update settings
  if (req.method === 'PUT') {
    try {
      const updates = {
        ...req.body,
        updatedAt: new Date(),
      };

      // Check subdomain uniqueness
      if (updates.subdomain) {
        const existing = await db.collection('site_settings').findOne({
          subdomain: updates.subdomain,
          userId: { $ne: authUser.id },
        });
        if (existing) {
          return res.status(400).json({ error: 'Subdomain already taken' });
        }
      }

      // Check custom domain uniqueness
      if (updates.customDomain) {
        const existing = await db.collection('site_settings').findOne({
          customDomain: { $regex: new RegExp(`^${updates.customDomain}$`, 'i') },
          userId: { $ne: authUser.id },
        });
        if (existing) {
          return res.status(400).json({ error: 'Custom domain already in use' });
        }
      }

      await db.collection('site_settings').updateOne(
        { userId: authUser.id },
        { $set: updates },
        { upsert: true }
      );

      const settings = await db.collection('site_settings').findOne({ userId: authUser.id });

      return res.status(200).json({
        id: settings!._id,
        userId: settings!.userId,
        siteName: settings!.siteName,
        siteDescription: settings!.siteDescription,
        customDomain: settings!.customDomain,
        subdomain: settings!.subdomain,
        twitterLink: settings!.twitterLink,
        linkedinLink: settings!.linkedinLink,
        githubLink: settings!.githubLink,
        websiteLink: settings!.websiteLink,
        dribbbleLink: settings!.dribbbleLink,
        huggingfaceLink: settings!.huggingfaceLink,
        leetcodeLink: settings!.leetcodeLink,
        newsletterEmail: settings!.newsletterEmail,
        domainStatus: settings!.domainStatus,
        createdAt: settings!.createdAt,
        updatedAt: settings!.updatedAt,
      });
    } catch (error) {
      console.error('Update settings error:', error);
      return res.status(500).json({ error: 'Failed to update settings' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
