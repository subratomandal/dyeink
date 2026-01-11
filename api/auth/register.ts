import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from '../_lib/mongodb';
import { getAuthUser } from '../_lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
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
    const { auth0Id, email, name, picture } = req.body;

    // Find or create user
    let user = await db.collection('users').findOne({ auth0Id: authUser.auth0Id });

    if (user) {
      // Update existing user
      await db.collection('users').updateOne(
        { auth0Id: authUser.auth0Id },
        {
          $set: {
            email: email || authUser.email,
            name: name || authUser.name,
            picture: picture || authUser.picture,
            updatedAt: new Date(),
          },
        }
      );
      user = await db.collection('users').findOne({ auth0Id: authUser.auth0Id });
    } else {
      // Create new user
      const userId = authUser.id;
      const newUser = {
        _id: userId,
        auth0Id: authUser.auth0Id,
        email: email || authUser.email,
        name: name || authUser.name,
        picture: picture || authUser.picture,
        isAdmin: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await db.collection('users').insertOne(newUser);
      user = newUser;

      // Create default site settings
      const subdomain = `blog-${userId.slice(0, 8)}`;
      await db.collection('site_settings').insertOne({
        userId: userId,
        siteName: name || authUser.name || 'My Blog',
        siteDescription: '',
        subdomain,
        customDomain: null,
        domainStatus: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    return res.status(200).json({
      id: user._id,
      email: user.email,
      name: user.name,
      picture: user.picture,
      isAdmin: user.isAdmin,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
  } catch (error: any) {
    console.error('Register error:', error);
    return res.status(500).json({ error: 'Failed to register user' });
  }
}
