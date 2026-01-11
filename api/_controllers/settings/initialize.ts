import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from '../../_lib/mongodb';
import { getAuthUser } from '../../_lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authUser = await getAuthUser(req);
  if (!authUser) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const db = await getDb();

    // Check if settings already exist
    let settings = await db.collection('site_settings').findOne({ userId: authUser.id });

    if (settings) {
      return res.status(200).json({
        id: settings._id,
        userId: settings.userId,
        siteName: settings.siteName,
        siteDescription: settings.siteDescription,
        customDomain: settings.customDomain,
        subdomain: settings.subdomain,
        domainStatus: settings.domainStatus,
        createdAt: settings.createdAt,
        updatedAt: settings.updatedAt,
      });
    }

    const { siteName, siteDescription, subdomain } = req.body;
    const defaultSubdomain = subdomain || `blog-${authUser.id.slice(0, 8)}`;

    settings = {
      userId: authUser.id,
      siteName: siteName || authUser.name || 'My Blog',
      siteDescription: siteDescription || '',
      subdomain: defaultSubdomain,
      customDomain: null,
      domainStatus: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.collection('site_settings').insertOne(settings as any);

    return res.status(201).json({
      id: settings._id,
      userId: settings.userId,
      siteName: settings.siteName,
      siteDescription: settings.siteDescription,
      customDomain: settings.customDomain,
      subdomain: settings.subdomain,
      domainStatus: settings.domainStatus,
      createdAt: settings.createdAt,
      updatedAt: settings.updatedAt,
    });
  } catch (error) {
    console.error('Initialize settings error:', error);
    return res.status(500).json({ error: 'Failed to initialize settings' });
  }
}
