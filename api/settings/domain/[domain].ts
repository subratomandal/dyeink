import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from '../../_lib/mongodb';

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

  const { domain } = req.query;

  if (!domain || typeof domain !== 'string') {
    return res.status(400).json({ error: 'Domain required' });
  }

  try {
    const db = await getDb();
    const settings = await db.collection('site_settings').findOne({
      customDomain: { $regex: new RegExp(`^${domain}$`, 'i') },
    });

    if (!settings) {
      return res.status(404).json({ error: 'Blog not found' });
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
    console.error('Get settings by domain error:', error);
    return res.status(500).json({ error: 'Failed to get settings' });
  }
}
