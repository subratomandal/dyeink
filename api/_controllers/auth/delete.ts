import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from '../../_lib/mongodb';
import { getAuthUser } from '../../_lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST' && req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authUser = await getAuthUser(req);
  if (!authUser) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const db = await getDb();

    // Delete user from Auth0 (if management token is available)
    const mgmtToken = process.env.AUTH0_MANAGEMENT_API_TOKEN;
    const auth0Domain = process.env.AUTH0_DOMAIN;

    if (mgmtToken && auth0Domain) {
      try {
        await fetch(`https://${auth0Domain}/api/v2/users/${authUser.auth0Id}`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${mgmtToken}`,
          },
        });
      } catch (e) {
        console.error('Failed to delete user from Auth0:', e);
      }
    }

    // Delete user data from MongoDB
    await Promise.all([
      db.collection('users').deleteOne({ _id: authUser.id as any }),
      db.collection('site_settings').deleteOne({ userId: authUser.id }),
      db.collection('posts').deleteMany({ userId: authUser.id }),
    ]);

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Delete user error:', error);
    return res.status(500).json({ error: 'Failed to delete user' });
  }
}
