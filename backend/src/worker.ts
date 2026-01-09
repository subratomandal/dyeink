/**
 * Cloudflare Worker Entry Point
 *
 * Note: This worker uses HTTP fetch to connect to MongoDB Atlas Data API
 * since Cloudflare Workers don't support native MongoDB drivers.
 *
 * For development/testing, use the standard Node.js server (src/index.ts).
 * For production on Cloudflare Workers, this file handles all API requests.
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { jwt } from 'hono/jwt';
import { MongoDBService } from './services/mongodb-api.js';
import { Auth0Service } from './services/auth0-worker.js';
import { R2StorageService } from './services/r2-worker.js';

type Bindings = {
  MONGODB_URI: string;
  MONGODB_DATA_API_KEY: string;
  MONGODB_DATA_API_URL: string;
  MONGODB_DATABASE: string;
  AUTH0_DOMAIN: string;
  AUTH0_AUDIENCE: string;
  AUTH0_CLIENT_ID: string;
  AUTH0_CLIENT_SECRET: string;
  AUTH0_MANAGEMENT_API_TOKEN: string;
  R2_ACCOUNT_ID: string;
  R2_ACCESS_KEY_ID: string;
  R2_SECRET_ACCESS_KEY: string;
  R2_BUCKET_NAME: string;
  R2_PUBLIC_URL: string;
  VERCEL_TOKEN: string;
  VERCEL_PROJECT_ID: string;
  VERCEL_TEAM_ID: string;
  IMAGES: R2Bucket;
};

type Variables = {
  user?: {
    id: string;
    auth0Id: string;
    email: string;
    name: string;
    picture?: string;
    isAdmin: boolean;
  };
  db: MongoDBService;
};

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// CORS
app.use('*', cors({
  origin: '*',
  credentials: true,
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

// Initialize MongoDB service
app.use('*', async (c, next) => {
  const db = new MongoDBService(
    c.env.MONGODB_DATA_API_URL,
    c.env.MONGODB_DATA_API_KEY,
    c.env.MONGODB_DATABASE
  );
  c.set('db', db);
  await next();
});

// Health check
app.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Auth middleware
const authMiddleware = async (c: any, next: any) => {
  const authHeader = c.req.header('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Missing or invalid authorization header' }, 401);
  }

  const token = authHeader.substring(7);

  try {
    const auth0 = new Auth0Service(c.env.AUTH0_DOMAIN, c.env.AUTH0_AUDIENCE);
    const payload = await auth0.verifyToken(token);

    const db = c.get('db');
    let user = await db.findOne('users', { auth0Id: payload.sub });

    if (!user) {
      const userId = payload.sub.replace('|', '_');
      user = await db.insertOne('users', {
        _id: userId,
        auth0Id: payload.sub,
        email: payload.email || '',
        name: payload.name || '',
        picture: payload.picture,
        isAdmin: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      user._id = userId;
    }

    c.set('user', {
      id: user._id,
      auth0Id: user.auth0Id,
      email: user.email,
      name: user.name,
      picture: user.picture,
      isAdmin: user.isAdmin,
    });

    await next();
  } catch (error) {
    console.error('Auth error:', error);
    return c.json({ error: 'Invalid or expired token' }, 401);
  }
};

// ==================== AUTH ROUTES ====================

app.post('/api/auth/register', authMiddleware, async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Not authenticated' }, 401);

  const db = c.get('db');
  const dbUser = await db.findOne('users', { _id: user.id });

  return c.json({
    id: dbUser._id,
    email: dbUser.email,
    name: dbUser.name,
    picture: dbUser.picture,
    isAdmin: dbUser.isAdmin,
    createdAt: dbUser.createdAt,
    updatedAt: dbUser.updatedAt,
  });
});

app.get('/api/auth/me', authMiddleware, async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Not authenticated' }, 401);

  const db = c.get('db');
  const dbUser = await db.findOne('users', { _id: user.id });

  if (!dbUser) return c.json({ error: 'User not found' }, 404);

  return c.json({
    id: dbUser._id,
    email: dbUser.email,
    name: dbUser.name,
    picture: dbUser.picture,
    isAdmin: dbUser.isAdmin,
    createdAt: dbUser.createdAt,
    updatedAt: dbUser.updatedAt,
  });
});

app.delete('/api/auth/delete', authMiddleware, async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Not authenticated' }, 401);

  const db = c.get('db');

  await Promise.all([
    db.deleteOne('users', { _id: user.id }),
    db.deleteOne('site_settings', { userId: user.id }),
  ]);

  return c.json({ success: true });
});

// ==================== POSTS ROUTES ====================

app.post('/api/posts', authMiddleware, async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Not authenticated' }, 401);

  const body = await c.req.json();
  const { title, slug, content, excerpt, coverImage, published } = body;

  const db = c.get('db');

  const existingPost = await db.findOne('posts', { userId: user.id, slug });
  if (existingPost) {
    return c.json({ error: 'A post with this slug already exists' }, 400);
  }

  const post = await db.insertOne('posts', {
    userId: user.id,
    title,
    slug,
    content: content || '',
    excerpt: excerpt || '',
    coverImage: coverImage || '',
    published: published || false,
    publishedAt: published ? new Date() : null,
    views: 0,
    shares: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  return c.json(post);
});

app.get('/api/posts', authMiddleware, async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Not authenticated' }, 401);

  const db = c.get('db');
  const posts = await db.find('posts', { userId: user.id }, { sort: { createdAt: -1 } });

  return c.json({ posts, total: posts.length });
});

app.get('/api/posts/public', async (c) => {
  const subdomain = c.req.query('subdomain');
  const customDomain = c.req.query('customDomain');

  const db = c.get('db');

  let settings;
  if (customDomain) {
    settings = await db.findOne('site_settings', { customDomain: { $regex: `^${customDomain}$`, $options: 'i' } });
  } else if (subdomain) {
    settings = await db.findOne('site_settings', { subdomain });
  }

  if (!settings) {
    return c.json({ error: 'Blog not found' }, 404);
  }

  const posts = await db.find('posts', { userId: settings.userId, published: true }, { sort: { publishedAt: -1 } });

  return c.json({ posts });
});

app.get('/api/posts/:id', async (c) => {
  const id = c.req.param('id');
  const db = c.get('db');

  const post = await db.findOne('posts', { _id: { $oid: id } });
  if (!post) return c.json({ error: 'Post not found' }, 404);

  return c.json(post);
});

app.get('/api/posts/slug/:slug', async (c) => {
  const slug = c.req.param('slug');
  const userId = c.req.query('userId');

  const db = c.get('db');

  const query: any = { slug };
  if (userId) query.userId = userId;

  const post = await db.findOne('posts', query);
  if (!post) return c.json({ error: 'Post not found' }, 404);

  return c.json(post);
});

app.put('/api/posts/:id', authMiddleware, async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Not authenticated' }, 401);

  const id = c.req.param('id');
  const updates = await c.req.json();

  const db = c.get('db');

  const post = await db.findOne('posts', { _id: { $oid: id } });
  if (!post) return c.json({ error: 'Post not found' }, 404);
  if (post.userId !== user.id) return c.json({ error: 'Access denied' }, 403);

  if (updates.published && !post.published) {
    updates.publishedAt = new Date();
  } else if (updates.published === false) {
    updates.publishedAt = null;
  }

  updates.updatedAt = new Date();

  const updatedPost = await db.updateOne('posts', { _id: { $oid: id } }, { $set: updates });

  return c.json(updatedPost);
});

app.delete('/api/posts/:id', authMiddleware, async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Not authenticated' }, 401);

  const id = c.req.param('id');
  const db = c.get('db');

  const post = await db.findOne('posts', { _id: { $oid: id } });
  if (!post) return c.json({ error: 'Post not found' }, 404);
  if (post.userId !== user.id) return c.json({ error: 'Access denied' }, 403);

  await db.deleteOne('posts', { _id: { $oid: id } });

  return c.json({ success: true });
});

app.delete('/api/posts', authMiddleware, async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Not authenticated' }, 401);

  const db = c.get('db');
  await db.deleteMany('posts', { userId: user.id });

  return c.json({ success: true });
});

// ==================== SETTINGS ROUTES ====================

app.get('/api/settings', authMiddleware, async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Not authenticated' }, 401);

  const db = c.get('db');
  let settings = await db.findOne('site_settings', { userId: user.id });

  if (!settings) {
    const subdomain = `blog-${user.id.slice(0, 8)}`;
    settings = await db.insertOne('site_settings', {
      userId: user.id,
      siteName: user.name || 'My Blog',
      siteDescription: '',
      subdomain,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  return c.json(settings);
});

app.get('/api/settings/subdomain/:subdomain', async (c) => {
  const subdomain = c.req.param('subdomain');
  const db = c.get('db');

  const settings = await db.findOne('site_settings', { subdomain });
  if (!settings) return c.json({ error: 'Blog not found' }, 404);

  return c.json(settings);
});

app.get('/api/settings/domain/:domain', async (c) => {
  const domain = c.req.param('domain');
  const db = c.get('db');

  const settings = await db.findOne('site_settings', { customDomain: { $regex: `^${domain}$`, $options: 'i' } });
  if (!settings) return c.json({ error: 'Blog not found' }, 404);

  return c.json(settings);
});

app.put('/api/settings', authMiddleware, async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Not authenticated' }, 401);

  const updates = await c.req.json();
  updates.updatedAt = new Date();

  const db = c.get('db');

  const settings = await db.updateOne(
    'site_settings',
    { userId: user.id },
    { $set: updates },
    { upsert: true }
  );

  return c.json(settings);
});

app.post('/api/settings/initialize', authMiddleware, async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Not authenticated' }, 401);

  const db = c.get('db');
  let settings = await db.findOne('site_settings', { userId: user.id });

  if (settings) return c.json(settings);

  const body = await c.req.json();
  const subdomain = body.subdomain || `blog-${user.id.slice(0, 8)}`;

  settings = await db.insertOne('site_settings', {
    userId: user.id,
    siteName: body.siteName || user.name || 'My Blog',
    siteDescription: body.siteDescription || '',
    subdomain,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  return c.json(settings);
});

// ==================== STATS ROUTES ====================

app.get('/api/hit', async (c) => {
  const id = c.req.query('id');
  const type = c.req.query('type') as 'view' | 'share';

  if (!id || !type || !['view', 'share'].includes(type)) {
    return c.json({ error: 'Invalid parameters' }, 400);
  }

  const db = c.get('db');

  const updateField = type === 'view' ? 'views' : 'shares';
  await db.updateOne('posts', { _id: { $oid: id } }, { $inc: { [updateField]: 1 } });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  await db.updateOne(
    'daily_post_stats',
    { postId: { $oid: id }, date: today },
    { $inc: { [updateField]: 1 } },
    { upsert: true }
  );

  return c.json({ ok: true });
});

app.get('/api/stats', authMiddleware, async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Not authenticated' }, 401);

  const db = c.get('db');

  const posts = await db.find('posts', { userId: user.id });

  const totalViews = posts.reduce((sum: number, p: any) => sum + (p.views || 0), 0);
  const totalShares = posts.reduce((sum: number, p: any) => sum + (p.shares || 0), 0);

  const settings = await db.findOne('site_settings', { userId: user.id });
  let totalSubscribers = 0;
  if (settings) {
    const subscribers = await db.find('subscribers', { blogId: settings._id, active: true });
    totalSubscribers = subscribers.length;
  }

  // Get last 7 days
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const graphData = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(sevenDaysAgo);
    date.setDate(date.getDate() + i);
    graphData.push({
      date: date.toISOString().split('T')[0],
      views: 0,
      shares: 0,
    });
  }

  return c.json({ totalViews, totalShares, totalSubscribers, graphData });
});

// ==================== SUBSCRIBERS ROUTES ====================

app.post('/api/subscribe', async (c) => {
  const body = await c.req.json();
  const { email, blogId, subdomain, customDomain } = body;

  if (!email) return c.json({ error: 'Email is required' }, 400);

  const db = c.get('db');

  let settings;
  if (blogId) {
    settings = await db.findOne('site_settings', { _id: { $oid: blogId } });
  } else if (subdomain) {
    settings = await db.findOne('site_settings', { subdomain });
  } else if (customDomain) {
    settings = await db.findOne('site_settings', { customDomain: { $regex: `^${customDomain}$`, $options: 'i' } });
  }

  if (!settings) return c.json({ error: 'Blog not found' }, 404);

  const existing = await db.findOne('subscribers', { email: email.toLowerCase(), blogId: settings._id });

  if (existing) {
    if (!existing.active) {
      await db.updateOne('subscribers', { _id: existing._id }, { $set: { active: true } });
      return c.json({ ok: true, message: 'Subscription reactivated' });
    }
    return c.json({ ok: true, message: 'Already subscribed' });
  }

  await db.insertOne('subscribers', {
    email: email.toLowerCase(),
    blogId: settings._id,
    active: true,
    verified: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  return c.json({ ok: true, message: 'Subscribed successfully' });
});

app.get('/api/subscribers', authMiddleware, async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Not authenticated' }, 401);

  const db = c.get('db');

  const settings = await db.findOne('site_settings', { userId: user.id });
  if (!settings) return c.json({ subscribers: [], total: 0 });

  const subscribers = await db.find('subscribers', { blogId: settings._id, active: true });

  return c.json({
    subscribers: subscribers.map((s: any) => ({
      id: s._id,
      email: s.email,
      verified: s.verified,
      createdAt: s.createdAt,
    })),
    total: subscribers.length,
  });
});

app.delete('/api/subscribers/:id', authMiddleware, async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Not authenticated' }, 401);

  const id = c.req.param('id');
  const db = c.get('db');

  await db.deleteOne('subscribers', { _id: { $oid: id } });

  return c.json({ success: true });
});

// ==================== DOMAINS ROUTES ====================

app.post('/api/domains', authMiddleware, async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Not authenticated' }, 401);

  const { domain } = await c.req.json();
  if (!domain) return c.json({ error: 'Domain is required' }, 400);

  const db = c.get('db');

  // Add to Vercel
  const vercelRes = await fetch(
    `https://api.vercel.com/v10/projects/${c.env.VERCEL_PROJECT_ID}/domains${c.env.VERCEL_TEAM_ID ? `?teamId=${c.env.VERCEL_TEAM_ID}` : ''}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${c.env.VERCEL_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: domain }),
    }
  );

  const vercelData = await vercelRes.json() as any;

  await db.updateOne(
    'site_settings',
    { userId: user.id },
    { $set: { customDomain: domain, domainStatus: vercelData.verified ? 'verified' : 'pending' } }
  );

  return c.json({
    success: true,
    verified: vercelData.verified,
    verification: vercelData.verification,
  });
});

app.get('/api/domains/verify', authMiddleware, async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Not authenticated' }, 401);

  const domain = c.req.query('domain');
  if (!domain) return c.json({ error: 'Domain is required' }, 400);

  const vercelRes = await fetch(
    `https://api.vercel.com/v9/projects/${c.env.VERCEL_PROJECT_ID}/domains/${domain}${c.env.VERCEL_TEAM_ID ? `?teamId=${c.env.VERCEL_TEAM_ID}` : ''}`,
    {
      headers: { Authorization: `Bearer ${c.env.VERCEL_TOKEN}` },
    }
  );

  const vercelData = await vercelRes.json() as any;

  if (vercelData.verified) {
    const db = c.get('db');
    await db.updateOne('site_settings', { userId: user.id }, { $set: { domainStatus: 'active' } });
  }

  return c.json({
    verified: vercelData.verified,
    verification: vercelData.verification,
  });
});

app.delete('/api/domains', authMiddleware, async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Not authenticated' }, 401);

  const db = c.get('db');
  const settings = await db.findOne('site_settings', { userId: user.id });

  if (!settings?.customDomain) {
    return c.json({ error: 'No custom domain configured' }, 404);
  }

  await fetch(
    `https://api.vercel.com/v9/projects/${c.env.VERCEL_PROJECT_ID}/domains/${settings.customDomain}${c.env.VERCEL_TEAM_ID ? `?teamId=${c.env.VERCEL_TEAM_ID}` : ''}`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${c.env.VERCEL_TOKEN}` },
    }
  );

  await db.updateOne('site_settings', { userId: user.id }, { $set: { customDomain: null, domainStatus: null } });

  return c.json({ success: true });
});

// ==================== UPLOAD ROUTES ====================

app.post('/api/upload', authMiddleware, async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Not authenticated' }, 401);

  const formData = await c.req.formData();
  const file = formData.get('file') as File;

  if (!file) return c.json({ error: 'No file uploaded' }, 400);

  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    return c.json({ error: 'Invalid file type' }, 400);
  }

  const buffer = await file.arrayBuffer();
  const filename = `${crypto.randomUUID()}_${Date.now()}.${file.name.split('.').pop()}`;

  await c.env.IMAGES.put(filename, buffer, {
    httpMetadata: { contentType: file.type },
  });

  const publicUrl = `${c.env.R2_PUBLIC_URL}/${filename}`;

  return c.json({ url: publicUrl });
});

app.post('/api/upload/presigned', authMiddleware, async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Not authenticated' }, 401);

  const { filename, contentType } = await c.req.json();

  const uniqueFilename = `${crypto.randomUUID()}_${Date.now()}_${filename}`;
  const publicUrl = `${c.env.R2_PUBLIC_URL}/${uniqueFilename}`;

  // For R2 direct upload, return the public URL and a signed URL would be generated
  // In practice, you'd use R2's signed URL feature
  return c.json({ publicUrl, filename: uniqueFilename });
});

export default app;
