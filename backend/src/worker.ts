/**
 * DyeInk — single-admin personal blog API, all-in-one Cloudflare Worker.
 *
 * - D1 for relational storage (`DB` binding)
 * - R2 for image uploads (`IMAGES` binding)
 * - Static assets served from the `ASSETS` binding (the Pages-style bundle)
 * - Password auth via PBKDF2 + HMAC-signed HTTPOnly session cookies
 *
 * No Node, no MongoDB, no external auth provider. One deploy, one password.
 */

import { Hono, type Context, type Next } from 'hono'
import { cors } from 'hono/cors'
import {
  clearSessionCookie,
  createSessionToken,
  hashPassword,
  randomToken,
  readSessionCookie,
  verifyPassword,
  verifySessionToken,
} from './lib/crypto'

type Bindings = {
  DB: D1Database
  IMAGES: R2Bucket
  ASSETS: Fetcher
  ANALYTICS?: AnalyticsEngineDataset
  EMAIL?: SendEmailBinding
  APP_PASSWORD?: string // optional: seeds the admin row on first deploy if present
  FRONTEND_ORIGIN?: string
  SITE_URL?: string
  EMAIL_FROM?: string
  EMAIL_FROM_NAME?: string
  R2_PUBLIC_URL?: string
  D1_HIT_ROLLUPS?: string
  CLOUDFLARE_API_TOKEN?: string
  CLOUDFLARE_ACCOUNT_ID?: string
  CLOUDFLARE_ZONE_ID?: string
  CLOUDFLARE_ZONE_NAME?: string
  CLOUDFLARE_WORKER_NAME?: string
  CLOUDFLARE_WORKER_ENVIRONMENT?: string
  CUSTOM_DOMAIN_TARGET?: string
}

type Variables = {
  session?: { iat: number; exp: number }
}

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>()

app.onError((err, c) => {
  console.error(err)
  return c.json({ error: 'Internal server error' }, 500)
})

// ---------- Global middleware ----------

app.use('/api/*', (c, next) => {
  const origin = c.env.FRONTEND_ORIGIN || c.req.header('origin') || '*'
  return cors({
    origin,
    credentials: true,
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })(c, next)
})

app.use('*', enforceCustomDomainBlogBoundary)

// ---------- Auth middleware ----------

type AppCtx = Context<{ Bindings: Bindings; Variables: Variables }>

type EmailMessageBuilder = {
  to: string | string[]
  from: string | { email: string; name: string }
  subject: string
  html?: string
  text?: string
  replyTo?: string | { email: string; name: string }
  headers?: Record<string, string>
}

type SendEmailBinding = {
  send(message: EmailMessageBuilder): Promise<{ messageId?: string }>
}

const PUBLIC_JSON_CACHE = 'public, max-age=60, s-maxage=300, stale-while-revalidate=86400'
const PUBLIC_ARTIFACT_PREFIX = 'public'
const PUBLIC_POSTS_SCHEMA_VERSION = 2

function hashString(input: string): string {
  let hash = 2166136261
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(36)
}

function publicPostArtifactKey(slug: string): string {
  return `${PUBLIC_ARTIFACT_PREFIX}/posts/${encodeURIComponent(slug)}.json`
}

function cachedJson(c: AppCtx, body: unknown, cacheControl = PUBLIC_JSON_CACHE) {
  const payload = JSON.stringify(body)
  const etag = `W/"${hashString(payload)}"`
  const headers = new Headers({
    'content-type': 'application/json; charset=utf-8',
    'cache-control': cacheControl,
    etag,
  })

  if (c.req.header('if-none-match') === etag) {
    return new Response(null, { status: 304, headers })
  }

  return new Response(payload, { headers })
}

async function cachedArtifactJson(
  c: AppCtx,
  key: string,
  fallback: () => Promise<unknown>,
  cacheControl = PUBLIC_JSON_CACHE,
  isArtifactFresh?: (body: string) => boolean,
) {
  const object = await c.env.IMAGES.get(key)
  if (object) {
    const headers = new Headers()
    object.writeHttpMetadata(headers)
    headers.set('content-type', 'application/json; charset=utf-8')
    headers.set('cache-control', cacheControl)
    headers.set('etag', object.httpEtag)

    if (isArtifactFresh) {
      const body = await object.text()
      if (isArtifactFresh(body)) {
        if (c.req.header('if-none-match') === object.httpEtag) {
          return new Response(null, { status: 304, headers })
        }
        return new Response(body, { headers })
      }
    } else {
      if (c.req.header('if-none-match') === object.httpEtag) {
        return new Response(null, { status: 304, headers })
      }
      return new Response(object.body, { headers })
    }
  }

  const body = await fallback()
  c.executionCtx.waitUntil(refreshPublicArtifacts(c.env).catch((err) => console.error(err)))
  return cachedJson(c, body, cacheControl)
}

function isFreshPublicPostsArtifact(body: string) {
  try {
    const payload = JSON.parse(body) as {
      schemaVersion?: number
      posts?: Array<{ preview?: unknown }>
    }
    return (
      payload.schemaVersion === PUBLIC_POSTS_SCHEMA_VERSION &&
      Array.isArray(payload.posts) &&
      payload.posts.every((post) => typeof post.preview === 'string')
    )
  } catch {
    return false
  }
}

async function getSessionSecret(c: AppCtx): Promise<string | null> {
  const row = await c.env.DB.prepare('SELECT session_secret FROM admin WHERE id = 1')
    .first<{ session_secret: string }>()
  return row?.session_secret ?? null
}

async function requireAuth(c: Context<{ Bindings: Bindings; Variables: Variables }>, next: Next) {
  const cookie = readSessionCookie(c.req.header('cookie') ?? null)
  if (!cookie) return c.json({ error: 'Not authenticated' }, 401)

  const secret = await getSessionSecret(c)
  if (!secret) return c.json({ error: 'Admin not initialized' }, 401)

  const payload = await verifySessionToken(cookie, secret)
  if (!payload) return c.json({ error: 'Invalid or expired session' }, 401)

  c.set('session', { iat: payload.iat, exp: payload.exp })
  await next()
}

// ---------- Rate limiting for /auth/login ----------

const LOGIN_WINDOW_SEC = 15 * 60
const LOGIN_MAX_ATTEMPTS = 10

async function recordLoginAttempt(db: D1Database, ip: string, success: boolean) {
  await db
    .prepare('INSERT INTO login_attempts (ip, attempted_at, success) VALUES (?, ?, ?)')
    .bind(ip, Math.floor(Date.now() / 1000), success ? 1 : 0)
    .run()
  // Opportunistic cleanup — drop rows older than the window.
  const cutoff = Math.floor(Date.now() / 1000) - LOGIN_WINDOW_SEC
  await db.prepare('DELETE FROM login_attempts WHERE attempted_at < ?').bind(cutoff).run()
}

async function isRateLimited(db: D1Database, ip: string): Promise<boolean> {
  const cutoff = Math.floor(Date.now() / 1000) - LOGIN_WINDOW_SEC
  const row = await db
    .prepare(
      'SELECT COUNT(*) AS n FROM login_attempts WHERE ip = ? AND success = 0 AND attempted_at >= ?',
    )
    .bind(ip, cutoff)
    .first<{ n: number }>()
  return (row?.n ?? 0) >= LOGIN_MAX_ATTEMPTS
}

// ---------- Setup / bootstrap ----------

const INIT_SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS admin (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  password_hash TEXT NOT NULL,
  session_secret TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);`,

  `CREATE TABLE IF NOT EXISTS site_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  site_name TEXT NOT NULL DEFAULT 'My Blog',
  site_description TEXT NOT NULL DEFAULT '',
  author_name TEXT NOT NULL DEFAULT '',
  author_email TEXT NOT NULL DEFAULT '',
  newsletter_enabled INTEGER NOT NULL DEFAULT 0,
  twitter_link TEXT,
  linkedin_link TEXT,
  github_link TEXT,
  website_link TEXT,
  dribbble_link TEXT,
  huggingface_link TEXT,
  leetcode_link TEXT,
  custom_domain TEXT,
  domain_status TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);`,

  `CREATE TABLE IF NOT EXISTS posts (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  content TEXT NOT NULL DEFAULT '',
  excerpt TEXT NOT NULL DEFAULT '',
  cover_image TEXT,
  published INTEGER NOT NULL DEFAULT 0,
  published_at INTEGER,
  views INTEGER NOT NULL DEFAULT 0,
  shares INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);`,

  'CREATE INDEX IF NOT EXISTS idx_posts_published ON posts(published, published_at DESC);',
  'CREATE INDEX IF NOT EXISTS idx_posts_created ON posts(created_at DESC);',

  `CREATE TABLE IF NOT EXISTS subscribers (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  verified INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);`,

  `CREATE TABLE IF NOT EXISTS daily_stats (
  post_id TEXT NOT NULL,
  day_utc INTEGER NOT NULL,
  views INTEGER NOT NULL DEFAULT 0,
  shares INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (post_id, day_utc),
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
);`,

  `CREATE TABLE IF NOT EXISTS login_attempts (
  ip TEXT NOT NULL,
  attempted_at INTEGER NOT NULL,
  success INTEGER NOT NULL DEFAULT 0
);`,
  'CREATE INDEX IF NOT EXISTS idx_login_attempts_ip ON login_attempts(ip, attempted_at);',
]

let schemaReady: Promise<void> | null = null

async function ensureSettingsColumn(db: D1Database, name: string, definition: string) {
  const { results } = await db.prepare('PRAGMA table_info(site_settings)').all<{ name: string }>()
  if (results.some((column) => column.name === name)) return
  await db.prepare(`ALTER TABLE site_settings ADD COLUMN ${definition}`).run()
}

async function runRuntimeMigrations(db: D1Database) {
  await ensureSettingsColumn(db, 'custom_domain', 'custom_domain TEXT')
  await ensureSettingsColumn(db, 'domain_status', 'domain_status TEXT')
  await db.prepare('CREATE UNIQUE INDEX IF NOT EXISTS idx_site_settings_custom_domain ON site_settings(custom_domain)').run()
}

function ensureSchema(db: D1Database): Promise<void> {
  schemaReady ??= db
    .batch(INIT_SCHEMA_STATEMENTS.map((statement) => db.prepare(statement)))
    .then(() => runRuntimeMigrations(db))
    .then(
      () => undefined,
      (err) => {
        schemaReady = null
        throw err
      },
    )
  return schemaReady
}

/**
 * On first request, initialize the schema and seed the admin row from APP_PASSWORD if present.
 * If APP_PASSWORD isn't set, GET /api/setup/status returns { initialized: false }
 * and the UI shows a setup form.
 */
async function ensureBootstrap(c: AppCtx) {
  await ensureSchema(c.env.DB)

  const row = await c.env.DB.prepare('SELECT id FROM admin WHERE id = 1').first()
  if (row) return

  const seed = c.env.APP_PASSWORD
  if (!seed) return // leave uninitialized; UI will drive setup

  const passwordHash = await hashPassword(seed)
  await c.env.DB.prepare(
    'INSERT OR IGNORE INTO admin (id, password_hash, session_secret) VALUES (1, ?, ?)',
  )
    .bind(passwordHash, randomToken(32))
    .run()

  await c.env.DB.prepare('INSERT OR IGNORE INTO site_settings (id) VALUES (1)').run()
}

app.use('/api/*', async (c, next) => {
  await ensureBootstrap(c)
  await next()
})

// ==========================================================================
// SETUP / AUTH
// ==========================================================================

app.get('/api/setup/status', async (c) => {
  const row = await c.env.DB.prepare('SELECT id FROM admin WHERE id = 1').first()
  return c.json({ initialized: !!row })
})

app.post('/api/setup', async (c) => {
  const row = await c.env.DB.prepare('SELECT id FROM admin WHERE id = 1').first()
  if (row) return c.json({ error: 'Already initialized' }, 400)

  const body = await c.req.json<{ password?: string }>()
  const password = body.password?.toString() ?? ''
  if (!isStrongPassword(password)) {
    return c.json(
      {
        error:
          'Password must be at least 12 characters and include upper, lower, number, and a special character.',
      },
      400,
    )
  }

  const passwordHash = await hashPassword(password)
  const secret = randomToken(32)
  await c.env.DB.prepare(
    'INSERT INTO admin (id, password_hash, session_secret) VALUES (1, ?, ?)',
  )
    .bind(passwordHash, secret)
    .run()
  await c.env.DB.prepare('INSERT OR IGNORE INTO site_settings (id) VALUES (1)').run()

  const { cookie } = await createSessionToken(secret)
  c.header('Set-Cookie', cookie)
  c.executionCtx.waitUntil(refreshPublicArtifacts(c.env).catch((err) => console.error(err)))
  return c.json({ ok: true })
})

app.post('/api/auth/login', async (c) => {
  const ip = c.req.header('cf-connecting-ip') ?? 'unknown'

  if (await isRateLimited(c.env.DB, ip)) {
    return c.json({ error: 'Too many attempts. Try again in 15 minutes.' }, 429)
  }

  const body = await c.req.json<{ password?: string }>()
  const password = body.password?.toString() ?? ''

  const row = await c.env.DB.prepare(
    'SELECT password_hash, session_secret FROM admin WHERE id = 1',
  ).first<{ password_hash: string; session_secret: string }>()

  if (!row) {
    await recordLoginAttempt(c.env.DB, ip, false)
    return c.json({ error: 'Admin not initialized' }, 404)
  }

  const ok = await verifyPassword(password, row.password_hash)
  await recordLoginAttempt(c.env.DB, ip, ok)

  if (!ok) return c.json({ error: 'Invalid password' }, 401)

  const { cookie } = await createSessionToken(row.session_secret)
  c.header('Set-Cookie', cookie)
  return c.json({ ok: true })
})

app.post('/api/auth/logout', async (c) => {
  c.header('Set-Cookie', clearSessionCookie())
  return c.json({ ok: true })
})

app.get('/api/auth/me', requireAuth, async (c) => {
  const session = c.get('session')!
  const settings = await c.env.DB.prepare(
    'SELECT author_name, author_email FROM site_settings WHERE id = 1',
  ).first<{ author_name: string; author_email: string }>()
  return c.json({
    name: settings?.author_name || 'Admin',
    email: settings?.author_email || '',
    sessionExpiresAt: session.exp,
  })
})

app.post('/api/auth/change-password', requireAuth, async (c) => {
  const { current, next } = await c.req.json<{ current?: string; next?: string }>()
  if (!current || !next) return c.json({ error: 'current + next required' }, 400)
  if (!isStrongPassword(next)) {
    return c.json({ error: 'New password is too weak.' }, 400)
  }

  const row = await c.env.DB.prepare('SELECT password_hash FROM admin WHERE id = 1').first<{
    password_hash: string
  }>()
  if (!row || !(await verifyPassword(current, row.password_hash))) {
    return c.json({ error: 'Current password incorrect' }, 401)
  }

  const newHash = await hashPassword(next)
  const newSecret = randomToken(32) // rotate: invalidates all sessions
  await c.env.DB.prepare(
    'UPDATE admin SET password_hash = ?, session_secret = ?, updated_at = unixepoch() WHERE id = 1',
  )
    .bind(newHash, newSecret)
    .run()

  const { cookie } = await createSessionToken(newSecret)
  c.header('Set-Cookie', cookie)
  return c.json({ ok: true })
})

// ==========================================================================
// POSTS
// ==========================================================================

interface PostRow {
  id: string
  title: string
  slug: string
  content: string
  excerpt: string
  cover_image: string | null
  published: number
  published_at: number | null
  views: number
  shares: number
  created_at: number
  updated_at: number
}

type PublicPostRow = PostRow

function htmlToPreviewText(value: string) {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

function buildPostPreview(excerpt: string, content: string) {
  const text = htmlToPreviewText(excerpt || content || '')
  if (text.length <= 280) return text
  return `${text.slice(0, 280).trimEnd()}...`
}

function serializePost(p: PostRow) {
  return {
    id: p.id,
    title: p.title,
    slug: p.slug,
    content: p.content,
    excerpt: p.excerpt,
    coverImage: p.cover_image || '',
    published: !!p.published,
    publishedAt: p.published_at ? new Date(p.published_at * 1000).toISOString() : null,
    views: p.views,
    shares: p.shares,
    createdAt: new Date(p.created_at * 1000).toISOString(),
    updatedAt: new Date(p.updated_at * 1000).toISOString(),
  }
}

function serializePublicPost(p: PublicPostRow) {
  return {
    id: p.id,
    title: p.title,
    slug: p.slug,
    excerpt: p.excerpt,
    preview: buildPostPreview(p.excerpt, p.content),
    coverImage: p.cover_image || '',
    published: !!p.published,
    publishedAt: p.published_at ? new Date(p.published_at * 1000).toISOString() : null,
    views: p.views,
    shares: p.shares,
    createdAt: new Date(p.created_at * 1000).toISOString(),
    updatedAt: new Date(p.updated_at * 1000).toISOString(),
  }
}

async function getPublicPostsPayload(db: D1Database) {
  const { results } = await db
    .prepare(
      `SELECT id, title, slug, content, excerpt, cover_image, published, published_at,
       views, shares, created_at, updated_at
       FROM posts WHERE published = 1 ORDER BY published_at DESC`,
    )
    .all<PublicPostRow>()
  return {
    schemaVersion: PUBLIC_POSTS_SCHEMA_VERSION,
    posts: results.map(serializePublicPost),
    total: results.length,
  }
}

async function getPublicPostPayload(db: D1Database, slug: string) {
  const row = await db
    .prepare('SELECT * FROM posts WHERE slug = ? AND published = 1')
    .bind(slug)
    .first<PostRow>()
  return row ? serializePost(row) : null
}

app.get('/api/posts', requireAuth, async (c) => {
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM posts ORDER BY created_at DESC',
  ).all<PostRow>()
  return c.json({ posts: results.map(serializePost), total: results.length })
})

app.post('/api/posts', requireAuth, async (c) => {
  const body = await c.req.json<{
    title: string
    slug?: string
    content?: string
    excerpt?: string
    coverImage?: string
    published?: boolean
  }>()

  const title = body.title?.trim()
  if (!title) return c.json({ error: 'Title is required' }, 400)
  const slug = (body.slug || slugify(title)).slice(0, 120)
  const id = randomToken(12)
  const now = Math.floor(Date.now() / 1000)
  const published = body.published ? 1 : 0

  try {
    await c.env.DB.prepare(
      `INSERT INTO posts
       (id, title, slug, content, excerpt, cover_image, published, published_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        id,
        title,
        slug,
        body.content ?? '',
        body.excerpt ?? '',
        body.coverImage ?? null,
        published,
        published ? now : null,
        now,
        now,
      )
      .run()
  } catch (e: any) {
    if (String(e.message).includes('UNIQUE')) {
      return c.json({ error: 'A post with this slug already exists' }, 400)
    }
    throw e
  }

  const row = await c.env.DB.prepare('SELECT * FROM posts WHERE id = ?')
    .bind(id)
    .first<PostRow>()
  c.executionCtx.waitUntil(refreshPublicArtifacts(c.env).catch((err) => console.error(err)))
  if (row?.published) {
    c.executionCtx.waitUntil(sendPublishedPostEmails(c, row).catch((err) => console.error(err)))
  }
  return c.json(serializePost(row!), 201)
})

app.get('/api/posts/public', async (c) => {
  return cachedJson(c, await getPublicPostsPayload(c.env.DB))
})

app.get('/api/posts/slug/:slug', async (c) => {
  const slug = c.req.param('slug')
  const row = await c.env.DB.prepare('SELECT * FROM posts WHERE slug = ?')
    .bind(slug)
    .first<PostRow>()
  if (!row) return c.json({ error: 'Post not found' }, 404)

  // If unpublished, require auth
  if (!row.published) {
    const session = await authPeek(c)
    if (!session) return c.json({ error: 'Not found' }, 404)
  }
  const body = serializePost(row)
  return row.published ? cachedJson(c, body) : c.json(body)
})

app.get('/api/posts/:id', async (c) => {
  const id = c.req.param('id')
  const row = await c.env.DB.prepare('SELECT * FROM posts WHERE id = ?')
    .bind(id)
    .first<PostRow>()
  if (!row) return c.json({ error: 'Post not found' }, 404)
  if (!row.published) {
    const session = await authPeek(c)
    if (!session) return c.json({ error: 'Not found' }, 404)
  }
  return c.json(serializePost(row))
})

app.put('/api/posts/:id', requireAuth, async (c) => {
  const id = c.req.param('id')
  const existing = await c.env.DB.prepare('SELECT * FROM posts WHERE id = ?')
    .bind(id)
    .first<PostRow>()
  if (!existing) return c.json({ error: 'Post not found' }, 404)

  const body = await c.req.json<{
    title?: string
    slug?: string
    content?: string
    excerpt?: string
    coverImage?: string | null
    published?: boolean
  }>()

  const now = Math.floor(Date.now() / 1000)
  const title = body.title ?? existing.title
  const slug = body.slug ?? existing.slug
  const content = body.content ?? existing.content
  const excerpt = body.excerpt ?? existing.excerpt
  const coverImage = body.coverImage === undefined ? existing.cover_image : body.coverImage
  const published = body.published === undefined ? !!existing.published : body.published
  let publishedAt = existing.published_at
  if (published && !existing.published) publishedAt = now
  else if (!published) publishedAt = null

  try {
    await c.env.DB.prepare(
      `UPDATE posts SET title = ?, slug = ?, content = ?, excerpt = ?, cover_image = ?,
       published = ?, published_at = ?, updated_at = ? WHERE id = ?`,
    )
      .bind(title, slug, content, excerpt, coverImage, published ? 1 : 0, publishedAt, now, id)
      .run()
  } catch (e: any) {
    if (String(e.message).includes('UNIQUE')) {
      return c.json({ error: 'A post with this slug already exists' }, 400)
    }
    throw e
  }

  const row = await c.env.DB.prepare('SELECT * FROM posts WHERE id = ?')
    .bind(id)
    .first<PostRow>()
  c.executionCtx.waitUntil(refreshPublicArtifacts(c.env).catch((err) => console.error(err)))
  if (row?.published && !existing.published) {
    c.executionCtx.waitUntil(sendPublishedPostEmails(c, row).catch((err) => console.error(err)))
  }
  return c.json(serializePost(row!))
})

app.delete('/api/posts/:id', requireAuth, async (c) => {
  const id = c.req.param('id')
  const res = await c.env.DB.prepare('DELETE FROM posts WHERE id = ?').bind(id).run()
  if (res.meta.changes === 0) return c.json({ error: 'Post not found' }, 404)
  c.executionCtx.waitUntil(refreshPublicArtifacts(c.env).catch((err) => console.error(err)))
  return c.json({ ok: true })
})

app.delete('/api/posts', requireAuth, async (c) => {
  await c.env.DB.prepare('DELETE FROM posts').run()
  c.executionCtx.waitUntil(refreshPublicArtifacts(c.env).catch((err) => console.error(err)))
  return c.json({ ok: true })
})

// ==========================================================================
// SETTINGS (singleton)
// ==========================================================================

interface SettingsRow {
  id: number
  site_name: string
  site_description: string
  author_name: string
  author_email: string
  newsletter_enabled: number
  twitter_link: string | null
  linkedin_link: string | null
  github_link: string | null
  website_link: string | null
  dribbble_link: string | null
  huggingface_link: string | null
  leetcode_link: string | null
  custom_domain: string | null
  domain_status: string | null
  created_at: number
  updated_at: number
}

function serializeSettings(r: SettingsRow | null) {
  if (!r) return null
  return {
    siteName: r.site_name,
    siteDescription: r.site_description,
    authorName: r.author_name,
    authorEmail: r.author_email,
    newsletterEnabled: !!r.newsletter_enabled,
    twitterLink: r.twitter_link,
    linkedinLink: r.linkedin_link,
    githubLink: r.github_link,
    websiteLink: r.website_link,
    dribbbleLink: r.dribbble_link,
    huggingfaceLink: r.huggingface_link,
    leetcodeLink: r.leetcode_link,
    customDomain: r.custom_domain,
    domainStatus: r.domain_status,
  }
}

type DomainStatus = 'pending' | 'verified' | 'active' | 'failed'

type CloudflareApiMessage = {
  code?: number
  message?: string
}

type CloudflareEnvelope<T> = {
  success: boolean
  result?: T
  errors?: CloudflareApiMessage[]
  messages?: CloudflareApiMessage[]
}

type CloudflareZone = {
  id: string
  name?: string
}

type CloudflareWorkerDomain = {
  id: string
  cert_id?: string
  environment?: string
  hostname: string
  service: string
  zone_id: string
  zone_name: string
}

type DomainConnectResult = {
  success: boolean
  verified: boolean
  hostname: string
  status: DomainStatus
  message: string
  domain?: CloudflareWorkerDomain
}

class CloudflareApiRequestError extends Error {
  status: number
  errors: CloudflareApiMessage[]

  constructor(status: number, errors: CloudflareApiMessage[], fallback: string) {
    super(errors.map((error) => error.message).filter(Boolean).join(' ') || fallback)
    this.name = 'CloudflareApiRequestError'
    this.status = status
    this.errors = errors
  }
}

function normalizeHostname(input: unknown) {
  if (typeof input !== 'string') throw new Error('Domain is required')

  let hostname = input.trim().toLowerCase()
  if (!hostname) throw new Error('Domain is required')

  if (/^https?:\/\//i.test(hostname)) {
    hostname = new URL(hostname).hostname
  } else {
    hostname = hostname.split('/')[0]
  }

  hostname = hostname.replace(/\.$/, '')
  if (hostname.includes(':')) hostname = hostname.split(':')[0]

  const labels = hostname.split('.')
  const invalid =
    hostname.length > 253 ||
    labels.length < 2 ||
    /^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname) ||
    labels.some(
      (label) =>
        label.length < 1 ||
        label.length > 63 ||
        label.startsWith('-') ||
        label.endsWith('-') ||
        !/^[a-z0-9-]+$/.test(label),
    )

  if (invalid) throw new Error('Enter a valid domain, for example blog.example.com')
  return hostname
}

function getZoneCandidates(hostname: string) {
  const labels = hostname.split('.')
  const candidates: string[] = []
  for (let index = 0; index <= labels.length - 2; index += 1) {
    candidates.push(labels.slice(index).join('.'))
  }
  return candidates
}

function getCloudflareAccountConfig(env: Bindings) {
  const token = env.CLOUDFLARE_API_TOKEN
  const accountId = env.CLOUDFLARE_ACCOUNT_ID
  const missing = [
    !token ? 'CLOUDFLARE_API_TOKEN' : '',
    !accountId ? 'CLOUDFLARE_ACCOUNT_ID' : '',
  ].filter(Boolean)
  return {
    token,
    accountId,
    missing,
    workerName: env.CLOUDFLARE_WORKER_NAME || 'dyeink',
    environment: env.CLOUDFLARE_WORKER_ENVIRONMENT,
  }
}

async function cloudflareApi<T>(
  env: Bindings,
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const { token } = getCloudflareAccountConfig(env)
  if (!token) throw new Error('Missing CLOUDFLARE_API_TOKEN')

  const headers = new Headers(init.headers)
  headers.set('Authorization', `Bearer ${token}`)
  headers.set('Accept', 'application/json')
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')

  const response = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
    ...init,
    headers,
  })
  const payload = (await response.json().catch(() => null)) as CloudflareEnvelope<T> | null
  if (!response.ok || !payload?.success) {
    throw new CloudflareApiRequestError(
      response.status,
      payload?.errors || [],
      `Cloudflare API request failed with status ${response.status}`,
    )
  }
  return payload.result as T
}

async function findCloudflareZone(env: Bindings, hostname: string): Promise<CloudflareZone | null> {
  if (env.CLOUDFLARE_ZONE_ID) {
    return {
      id: env.CLOUDFLARE_ZONE_ID,
      name: env.CLOUDFLARE_ZONE_NAME,
    }
  }

  for (const candidate of getZoneCandidates(hostname)) {
    const zones = await cloudflareApi<CloudflareZone[]>(
      env,
      `/zones?name=${encodeURIComponent(candidate)}&status=active&per_page=1`,
    )
    if (zones.length > 0) return zones[0]
  }

  return null
}

function domainInstructionTarget(c: AppCtx) {
  const configured = c.env.CUSTOM_DOMAIN_TARGET || c.env.SITE_URL || c.env.FRONTEND_ORIGIN
  if (configured && configured !== '*') return configured.replace(/^https?:\/\//, '').replace(/\/$/, '')
  return new URL(c.req.url).hostname
}

async function attachCloudflareDomain(
  env: Bindings,
  hostname: string,
  zone: CloudflareZone,
): Promise<CloudflareWorkerDomain> {
  const { accountId, workerName, environment } = getCloudflareAccountConfig(env)
  const body = {
    hostname,
    service: workerName,
    zone_id: zone.id,
    ...(zone.name ? { zone_name: zone.name } : {}),
    ...(environment ? { environment } : {}),
  }

  return cloudflareApi<CloudflareWorkerDomain>(
    env,
    `/accounts/${accountId}/workers/domains`,
    {
      method: 'PUT',
      body: JSON.stringify(body),
    },
  )
}

async function listCloudflareDomains(env: Bindings, hostname: string) {
  const { accountId, workerName, environment } = getCloudflareAccountConfig(env)
  const params = new URLSearchParams({
    hostname,
    service: workerName,
    per_page: '100',
  })
  if (environment) params.set('environment', environment)
  return cloudflareApi<CloudflareWorkerDomain[]>(
    env,
    `/accounts/${accountId}/workers/domains?${params.toString()}`,
  )
}

async function detachCloudflareDomain(env: Bindings, domainId: string) {
  const { accountId } = getCloudflareAccountConfig(env)
  return cloudflareApi<{ success: true }>(env, `/accounts/${accountId}/workers/domains/${domainId}`, {
    method: 'DELETE',
  })
}

async function getSettingsPayload(db: D1Database) {
  const row = await db.prepare('SELECT * FROM site_settings WHERE id = 1').first<SettingsRow>()
  return serializeSettings(row)
}

async function getPublicDomainRoutingSettings(env: Bindings) {
  await ensureSchema(env.DB)
  return env.DB.prepare('SELECT custom_domain, domain_status FROM site_settings WHERE id = 1').first<{
    custom_domain: string | null
    domain_status: string | null
  }>()
}

function requestHostname(c: AppCtx) {
  return new URL(c.req.url).hostname.toLowerCase().replace(/\.$/, '')
}

function normalizeStoredHostname(hostname: string | null | undefined) {
  return hostname?.toLowerCase().replace(/^https?:\/\//, '').split('/')[0].replace(/\.$/, '') || ''
}

function isLocalHostname(hostname: string) {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0'
}

function isWorkersPreviewHostname(hostname: string) {
  return hostname.endsWith('.workers.dev') || hostname.endsWith('.pages.dev')
}

function isPublicBlogPath(pathname: string) {
  return pathname === '/blog' || pathname.startsWith('/blog/')
}

function isStaticAssetPath(pathname: string) {
  return (
    pathname.startsWith('/assets/') ||
    pathname === '/favicon.ico' ||
    pathname === '/robots.txt' ||
    pathname === '/sitemap.xml' ||
    pathname === '/Di.png' ||
    pathname === '/ddd.png'
  )
}

function isCustomDomainPublicSupportPath(c: AppCtx, pathname: string) {
  const method = c.req.method.toUpperCase()

  if (
    isStaticAssetPath(pathname) ||
    pathname.startsWith('/public/') ||
    pathname.startsWith('/img/')
  ) {
    return true
  }

  if (method === 'OPTIONS' && pathname.startsWith('/api/')) return true
  if (method === 'GET' && pathname === '/api/settings') return true
  if (method === 'GET' && pathname === '/api/posts/public') return true
  if (method === 'GET' && pathname.startsWith('/api/posts/slug/')) return true
  if ((method === 'GET' || method === 'POST') && pathname === '/api/hit') return true
  if (method === 'POST' && pathname === '/api/subscribe') return true
  if ((method === 'GET' || method === 'POST') && pathname === '/api/unsubscribe') return true

  return false
}

async function enforceCustomDomainBlogBoundary(c: AppCtx, next: Next) {
  const host = requestHostname(c)
  if (isLocalHostname(host) || isWorkersPreviewHostname(host)) return next()

  const routingSettings = await getPublicDomainRoutingSettings(c.env).catch(() => null)
  const customDomain = normalizeStoredHostname(routingSettings?.custom_domain)
  if (!customDomain || host !== customDomain || !isConnectedDomainStatus(routingSettings?.domain_status)) {
    return next()
  }

  const url = new URL(c.req.url)
  if (isPublicBlogPath(url.pathname) || isCustomDomainPublicSupportPath(c, url.pathname)) {
    return next()
  }

  if (url.pathname.startsWith('/api/')) {
    return c.json({ error: 'Not found' }, 404)
  }

  url.pathname = '/blog'
  url.search = ''
  return c.redirect(url.toString(), 302)
}

function isConnectedDomainStatus(status: string | null | undefined) {
  return status === 'verified' || status === 'active'
}

function isEmailServiceReady(env: Bindings) {
  return !!env.EMAIL && !!env.EMAIL_FROM && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(env.EMAIL_FROM)
}

function getBaseUrl(c: AppCtx, settings?: SettingsRow | null) {
  const customDomain = normalizeStoredHostname(settings?.custom_domain)
  if (customDomain && isConnectedDomainStatus(settings?.domain_status)) return `https://${customDomain}`

  const configured = c.env.SITE_URL || c.env.FRONTEND_ORIGIN
  if (configured && configured !== '*') return configured.replace(/\/$/, '')
  return new URL(c.req.url).origin
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function buildEmailFrom(settings: SettingsRow | null, env: Bindings) {
  const name = env.EMAIL_FROM_NAME || settings?.site_name || 'DyeInk'
  return { email: env.EMAIL_FROM!, name }
}

function buildUnsubscribeUrl(baseUrl: string, subscriberId: string) {
  return `${baseUrl}/api/unsubscribe?id=${encodeURIComponent(subscriberId)}`
}

async function sendNewsletterEmail(
  env: Bindings,
  message: Omit<EmailMessageBuilder, 'from'> & { from?: EmailMessageBuilder['from'] },
) {
  if (!isEmailServiceReady(env)) return
  await env.EMAIL!.send({
    ...message,
    from: message.from || env.EMAIL_FROM!,
  })
}

async function sendWelcomeEmail(c: AppCtx, email: string, subscriberId: string) {
  if (!isEmailServiceReady(c.env)) return

  const settings = await c.env.DB.prepare('SELECT * FROM site_settings WHERE id = 1')
    .first<SettingsRow>()
  const siteName = settings?.site_name || 'DyeInk'
  const baseUrl = getBaseUrl(c, settings)
  const unsubscribeUrl = buildUnsubscribeUrl(baseUrl, subscriberId)
  const safeSiteName = escapeHtml(siteName)

  await sendNewsletterEmail(c.env, {
    to: email,
    from: buildEmailFrom(settings, c.env),
    subject: `Subscribed to ${siteName}`,
    html: `
      <p>You are subscribed to <strong>${safeSiteName}</strong>.</p>
      <p>New posts will arrive here when they are published.</p>
      <p><a href="${baseUrl}/blog">Read the blog</a></p>
      <p style="color:#666;font-size:12px"><a href="${unsubscribeUrl}">Unsubscribe</a></p>
    `,
    text: `You are subscribed to ${siteName}.\n\nRead the blog: ${baseUrl}/blog\n\nUnsubscribe: ${unsubscribeUrl}`,
    headers: {
      'List-Unsubscribe': `<${unsubscribeUrl}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    },
  })
}

async function sendPublishedPostEmails(c: AppCtx, post: PostRow) {
  if (!isEmailServiceReady(c.env)) return

  const settings = await c.env.DB.prepare('SELECT * FROM site_settings WHERE id = 1')
    .first<SettingsRow>()
  if (!settings?.newsletter_enabled) return

  const { results: subscribers } = await c.env.DB.prepare(
    'SELECT id, email FROM subscribers WHERE active = 1 ORDER BY created_at ASC',
  ).all<{ id: string; email: string }>()
  if (subscribers.length === 0) return

  const siteName = settings.site_name || 'DyeInk'
  const baseUrl = getBaseUrl(c, settings)
  const postUrl = `${baseUrl}/blog/${encodeURIComponent(post.slug)}`
  const preview = buildPostPreview(post.excerpt, post.content)
  const safeTitle = escapeHtml(post.title)
  const safeSiteName = escapeHtml(siteName)
  const safePreview = escapeHtml(preview)

  for (let i = 0; i < subscribers.length; i += 10) {
    const chunk = subscribers.slice(i, i + 10)
    await Promise.allSettled(
      chunk.map((subscriber) => {
        const unsubscribeUrl = buildUnsubscribeUrl(baseUrl, subscriber.id)
        return sendNewsletterEmail(c.env, {
          to: subscriber.email,
          from: buildEmailFrom(settings, c.env),
          subject: `New post: ${post.title}`,
          html: `
            <p style="color:#666">${safeSiteName}</p>
            <h1>${safeTitle}</h1>
            ${safePreview ? `<p>${safePreview}</p>` : ''}
            <p><a href="${postUrl}">Read the post</a></p>
            <p style="color:#666;font-size:12px"><a href="${unsubscribeUrl}">Unsubscribe</a></p>
          `,
          text: `${siteName}\n\n${post.title}\n\n${preview ? `${preview}\n\n` : ''}Read the post: ${postUrl}\n\nUnsubscribe: ${unsubscribeUrl}`,
          headers: {
            'List-Unsubscribe': `<${unsubscribeUrl}>`,
            'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
          },
        })
      }),
    )
  }
}

async function putJsonArtifact(bucket: R2Bucket, key: string, value: unknown) {
  await bucket.put(key, JSON.stringify(value), {
    httpMetadata: {
      contentType: 'application/json; charset=utf-8',
      cacheControl: PUBLIC_JSON_CACHE,
    },
  })
}

async function deleteStalePostArtifacts(bucket: R2Bucket, activeKeys: Set<string>) {
  let cursor: string | undefined
  do {
    const listed = await bucket.list({
      prefix: `${PUBLIC_ARTIFACT_PREFIX}/posts/`,
      cursor,
    })
    await Promise.all(
      listed.objects
        .filter((object) => object.key.endsWith('.json') && !activeKeys.has(object.key))
        .map((object) => bucket.delete(object.key)),
    )
    cursor = listed.truncated ? listed.cursor : undefined
  } while (cursor)
}

async function refreshPublicArtifacts(env: Bindings) {
  const [settings, publicPosts] = await Promise.all([
    getSettingsPayload(env.DB),
    getPublicPostsPayload(env.DB),
  ])
  const { results: fullPosts } = await env.DB.prepare(
    'SELECT * FROM posts WHERE published = 1 ORDER BY published_at DESC',
  ).all<PostRow>()

  const activePostKeys = new Set(fullPosts.map((post) => publicPostArtifactKey(post.slug)))
  await Promise.all([
    putJsonArtifact(env.IMAGES, `${PUBLIC_ARTIFACT_PREFIX}/settings.json`, settings),
    putJsonArtifact(env.IMAGES, `${PUBLIC_ARTIFACT_PREFIX}/posts.json`, publicPosts),
    ...fullPosts.map((post) =>
      putJsonArtifact(env.IMAGES, publicPostArtifactKey(post.slug), serializePost(post)),
    ),
  ])
  await deleteStalePostArtifacts(env.IMAGES, activePostKeys)
}

app.get('/public/settings.json', async (c) => {
  await ensureBootstrap(c)
  return cachedArtifactJson(
    c,
    `${PUBLIC_ARTIFACT_PREFIX}/settings.json`,
    () => getSettingsPayload(c.env.DB),
  )
})

app.get('/public/posts.json', async (c) => {
  await ensureBootstrap(c)
  return cachedArtifactJson(
    c,
    `${PUBLIC_ARTIFACT_PREFIX}/posts.json`,
    () => getPublicPostsPayload(c.env.DB),
    PUBLIC_JSON_CACHE,
    isFreshPublicPostsArtifact,
  )
})

app.get('/public/posts/:file', async (c) => {
  const file = c.req.param('file')
  if (!file.endsWith('.json')) return c.notFound()

  await ensureBootstrap(c)
  const slug = decodeURIComponent(file.slice(0, -'.json'.length))
  const fallback = async () => {
    const post = await getPublicPostPayload(c.env.DB, slug)
    if (!post) return null
    return post
  }
  const post = await c.env.IMAGES.get(publicPostArtifactKey(slug))
  if (!post) {
    const payload = await fallback()
    if (!payload) return c.json({ error: 'Post not found' }, 404)
    c.executionCtx.waitUntil(refreshPublicArtifacts(c.env).catch((err) => console.error(err)))
    return cachedJson(c, payload)
  }

  const headers = new Headers()
  post.writeHttpMetadata(headers)
  headers.set('content-type', 'application/json; charset=utf-8')
  headers.set('cache-control', PUBLIC_JSON_CACHE)
  headers.set('etag', post.httpEtag)
  if (c.req.header('if-none-match') === post.httpEtag) {
    return new Response(null, { status: 304, headers })
  }
  return new Response(post.body, { headers })
})

app.get('/api/settings', async (c) => {
  return cachedJson(c, await getSettingsPayload(c.env.DB))
})

app.put('/api/settings', requireAuth, async (c) => {
  const body = await c.req.json<{
    siteName?: string
    siteDescription?: string
    authorName?: string
    authorEmail?: string
    newsletterEnabled?: boolean
    twitterLink?: string | null
    linkedinLink?: string | null
    githubLink?: string | null
    websiteLink?: string | null
    dribbbleLink?: string | null
    huggingfaceLink?: string | null
    leetcodeLink?: string | null
    customDomain?: string | null
    domainStatus?: DomainStatus | null
  }>()

  await c.env.DB.prepare('INSERT OR IGNORE INTO site_settings (id) VALUES (1)').run()

  const existing = await c.env.DB.prepare('SELECT * FROM site_settings WHERE id = 1')
    .first<SettingsRow>()

  let normalizedCustomDomain = existing!.custom_domain
  if (body.customDomain !== undefined) {
    try {
      normalizedCustomDomain = body.customDomain ? normalizeHostname(body.customDomain) : null
    } catch (err: any) {
      return c.json({ error: err.message || 'Invalid custom domain' }, 400)
    }
  }

  const merged = {
    site_name: body.siteName ?? existing!.site_name,
    site_description: body.siteDescription ?? existing!.site_description,
    author_name: body.authorName ?? existing!.author_name,
    author_email: body.authorEmail ?? existing!.author_email,
    newsletter_enabled:
      body.newsletterEnabled === undefined ? existing!.newsletter_enabled : body.newsletterEnabled ? 1 : 0,
    twitter_link: body.twitterLink === undefined ? existing!.twitter_link : body.twitterLink,
    linkedin_link: body.linkedinLink === undefined ? existing!.linkedin_link : body.linkedinLink,
    github_link: body.githubLink === undefined ? existing!.github_link : body.githubLink,
    website_link: body.websiteLink === undefined ? existing!.website_link : body.websiteLink,
    dribbble_link: body.dribbbleLink === undefined ? existing!.dribbble_link : body.dribbbleLink,
    huggingface_link:
      body.huggingfaceLink === undefined ? existing!.huggingface_link : body.huggingfaceLink,
    leetcode_link: body.leetcodeLink === undefined ? existing!.leetcode_link : body.leetcodeLink,
    custom_domain: normalizedCustomDomain,
    domain_status: body.domainStatus === undefined ? existing!.domain_status : body.domainStatus,
  }

  await c.env.DB.prepare(
    `UPDATE site_settings SET site_name = ?, site_description = ?, author_name = ?,
     author_email = ?, newsletter_enabled = ?, twitter_link = ?, linkedin_link = ?,
     github_link = ?, website_link = ?, dribbble_link = ?, huggingface_link = ?,
     leetcode_link = ?, custom_domain = ?, domain_status = ?, updated_at = unixepoch() WHERE id = 1`,
  )
    .bind(
      merged.site_name,
      merged.site_description,
      merged.author_name,
      merged.author_email,
      merged.newsletter_enabled,
      merged.twitter_link,
      merged.linkedin_link,
      merged.github_link,
      merged.website_link,
      merged.dribbble_link,
      merged.huggingface_link,
      merged.leetcode_link,
      merged.custom_domain,
      merged.domain_status,
    )
    .run()

  const row = await c.env.DB.prepare('SELECT * FROM site_settings WHERE id = 1')
    .first<SettingsRow>()
  c.executionCtx.waitUntil(refreshPublicArtifacts(c.env).catch((err) => console.error(err)))
  return c.json(serializeSettings(row))
})

async function saveDomainSettings(c: AppCtx, customDomain: string | null, status: DomainStatus | null) {
  await c.env.DB.prepare(
    'UPDATE site_settings SET custom_domain = ?, domain_status = ?, updated_at = unixepoch() WHERE id = 1',
  )
    .bind(customDomain, status)
    .run()
  const row = await c.env.DB.prepare('SELECT * FROM site_settings WHERE id = 1')
    .first<SettingsRow>()
  c.executionCtx.waitUntil(refreshPublicArtifacts(c.env).catch((err) => console.error(err)))
  return serializeSettings(row)
}

async function connectCustomDomain(c: AppCtx) {
  const body = (await c.req.json<{ domain?: string }>().catch(() => ({}))) as { domain?: string }
  let hostname: string

  try {
    hostname = normalizeHostname(body.domain)
  } catch (err: any) {
    return c.json({ success: false, error: err.message || 'Invalid domain' }, 400)
  }

  const config = getCloudflareAccountConfig(c.env)
  if (config.missing.length > 0) {
    return c.json(
      {
        success: false,
        error: `Cloudflare custom-domain automation is not configured. Add ${config.missing.join(
          ' and ',
        )} as Worker runtime secrets/variables, then try again.`,
        missing: config.missing,
      },
      503,
    )
  }

  let zone: CloudflareZone | null = null
  try {
    zone = await findCloudflareZone(c.env, hostname)
  } catch (err: any) {
    return c.json(
      {
        success: false,
        error:
          err instanceof CloudflareApiRequestError
            ? `Could not read Cloudflare zones: ${err.message}`
            : err.message || 'Could not read Cloudflare zones',
      },
      502,
    )
  }

  if (!zone) {
    return c.json(
      {
        success: false,
        error: `${hostname} is not inside an active Cloudflare zone in this account.`,
        requiresCloudflareZone: true,
        instructions: {
          target: domainInstructionTarget(c),
          steps: [
            'Add the domain to this Cloudflare account, or use a domain already managed by Cloudflare.',
            'Wait until the Cloudflare zone is active.',
            'Return here and press Connect domain again.',
          ],
        },
      },
      400,
    )
  }

  try {
    const domain = await attachCloudflareDomain(c.env, hostname, zone)
    const status: DomainStatus = 'verified'
    const settings = await saveDomainSettings(c, hostname, status)
    const result: DomainConnectResult = {
      success: true,
      verified: true,
      hostname,
      status,
      message: 'Domain connected! SSL is being issued. This can take 5–20 minutes.',
      domain,
    }
    return c.json({ ...result, settings })
  } catch (err: any) {
    await saveDomainSettings(c, hostname, 'failed')
    return c.json(
      {
        success: false,
        hostname,
        error:
          err instanceof CloudflareApiRequestError
            ? err.message
            : err.message || 'Failed to add domain to Cloudflare',
      },
      502,
    )
  }
}

async function disconnectCustomDomain(c: AppCtx) {
  const row = await c.env.DB.prepare('SELECT * FROM site_settings WHERE id = 1')
    .first<SettingsRow>()
  const hostname = row?.custom_domain

  const config = getCloudflareAccountConfig(c.env)
  if (hostname && config.missing.length === 0) {
    try {
      const domains = await listCloudflareDomains(c.env, hostname)
      await Promise.all(domains.map((domain) => detachCloudflareDomain(c.env, domain.id)))
    } catch (err: any) {
      return c.json(
        {
          ok: false,
          error:
            err instanceof CloudflareApiRequestError
              ? err.message
              : err.message || 'Failed to remove domain from Cloudflare',
        },
        502,
      )
    }
  }

  const settings = await saveDomainSettings(c, null, null)
  return c.json({ ok: true, settings })
}

app.post('/api/add-domain', requireAuth, connectCustomDomain)
app.post('/api/domains/connect', requireAuth, connectCustomDomain)
app.delete('/api/add-domain', requireAuth, disconnectCustomDomain)
app.delete('/api/domains/connect', requireAuth, disconnectCustomDomain)

// ==========================================================================
// STATS
// ==========================================================================

async function recordD1Hit(env: Bindings, id: string, type: 'view' | 'share') {
  const field = type === 'view' ? 'views' : 'shares'
  const updated = await env.DB.prepare(
    `UPDATE posts SET ${field} = ${field} + 1 WHERE id = ? AND published = 1`,
  )
    .bind(id)
    .run()

  if ((updated.meta.changes ?? 0) === 0) return

  const dayUtc = Math.floor(Date.now() / 1000 / 86400) * 86400
  await env.DB.prepare(
    `INSERT INTO daily_stats (post_id, day_utc, ${field}) VALUES (?, ?, 1)
     ON CONFLICT(post_id, day_utc) DO UPDATE SET ${field} = ${field} + 1`,
  )
    .bind(id, dayUtc)
    .run()
}

async function handleHit(c: AppCtx, id: string | undefined, type: string | undefined) {
  if (!id || (type !== 'view' && type !== 'share')) {
    return c.json({ error: 'Invalid parameters' }, 400)
  }

  c.env.ANALYTICS?.writeDataPoint({
    indexes: [id],
    blobs: [type, c.req.header('cf-ipcountry') ?? 'unknown'],
    doubles: [Date.now()],
  })

  if (c.env.D1_HIT_ROLLUPS !== 'off') {
    await recordD1Hit(c.env, id, type)
  }

  c.header('Cache-Control', 'no-store, max-age=0')
  return c.json({ ok: true })
}

app.get('/api/hit', async (c) => {
  return handleHit(c, c.req.query('id'), c.req.query('type'))
})

app.post('/api/hit', async (c) => {
  const body = (await c.req.json<{ id?: string; type?: string }>().catch(() => ({}))) as {
    id?: string
    type?: string
  }
  return handleHit(c, body.id, body.type)
})

app.get('/api/stats', requireAuth, async (c) => {
  const totals = await c.env.DB.prepare(
    'SELECT COALESCE(SUM(views), 0) AS views, COALESCE(SUM(shares), 0) AS shares FROM posts',
  ).first<{ views: number; shares: number }>()

  const subs = await c.env.DB.prepare(
    'SELECT COUNT(*) AS n FROM subscribers WHERE active = 1',
  ).first<{ n: number }>()

  const now = Math.floor(Date.now() / 1000)
  const sevenDaysAgo = now - 6 * 86400
  const startOfToday = Math.floor(now / 86400) * 86400
  const startOfWindow = Math.floor(sevenDaysAgo / 86400) * 86400

  const { results } = await c.env.DB.prepare(
    `SELECT day_utc, SUM(views) AS views, SUM(shares) AS shares
     FROM daily_stats WHERE day_utc >= ? GROUP BY day_utc ORDER BY day_utc ASC`,
  )
    .bind(startOfWindow)
    .all<{ day_utc: number; views: number; shares: number }>()

  const graphData = []
  for (let d = startOfWindow; d <= startOfToday; d += 86400) {
    const hit = results.find((r) => r.day_utc === d)
    const date = new Date(d * 1000).toISOString().split('T')[0]
    graphData.push({
      date,
      name: new Date(d * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      views: hit?.views ?? 0,
      shares: hit?.shares ?? 0,
    })
  }

  return c.json({
    totalViews: totals?.views ?? 0,
    totalShares: totals?.shares ?? 0,
    totalSubscribers: subs?.n ?? 0,
    graphData,
  })
})

// ==========================================================================
// SUBSCRIBERS
// ==========================================================================

app.post('/api/subscribe', async (c) => {
  const body = (await c.req.json<{ email?: string }>().catch(() => ({}))) as { email?: string }
  const email = body.email?.trim().toLowerCase()
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return c.json({ error: 'Invalid email' }, 400)
  }

  const existing = await c.env.DB.prepare('SELECT id, active FROM subscribers WHERE email = ?')
    .bind(email)
    .first<{ id: string; active: number }>()

  if (existing) {
    if (!existing.active) {
      await c.env.DB.prepare('UPDATE subscribers SET active = 1 WHERE id = ?')
        .bind(existing.id)
        .run()
      c.executionCtx.waitUntil(sendWelcomeEmail(c, email, existing.id).catch((err) => console.error(err)))
      c.header('Cache-Control', 'no-store, max-age=0')
      return c.json({
        ok: true,
        message: 'Subscription reactivated',
        emailDelivery: isEmailServiceReady(c.env) ? 'queued' : 'disabled',
      })
    }
    c.header('Cache-Control', 'no-store, max-age=0')
    return c.json({ ok: true, message: 'Already subscribed' })
  }

  const subscriberId = randomToken(12)
  await c.env.DB.prepare('INSERT INTO subscribers (id, email) VALUES (?, ?)')
    .bind(subscriberId, email)
    .run()
  c.executionCtx.waitUntil(sendWelcomeEmail(c, email, subscriberId).catch((err) => console.error(err)))
  c.header('Cache-Control', 'no-store, max-age=0')
  return c.json({
    ok: true,
    message: 'Subscribed',
    emailDelivery: isEmailServiceReady(c.env) ? 'queued' : 'disabled',
  })
})

async function unsubscribeById(c: AppCtx, id: string | undefined) {
  const subscriberId = id?.trim()
  if (!subscriberId) return c.json({ error: 'Missing unsubscribe token' }, 400)

  await c.env.DB.prepare('UPDATE subscribers SET active = 0 WHERE id = ?')
    .bind(subscriberId)
    .run()
  c.header('Cache-Control', 'no-store, max-age=0')
  return new Response(
    `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Unsubscribed</title></head><body style="font-family:system-ui,sans-serif;padding:40px;line-height:1.5"><h1>Unsubscribed</h1><p>You will no longer receive email updates from this blog.</p><p><a href="/blog">Return to blog</a></p></body></html>`,
    { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store, max-age=0' } },
  )
}

app.get('/api/unsubscribe', async (c) => {
  return unsubscribeById(c, c.req.query('id'))
})

app.post('/api/unsubscribe', async (c) => {
  const body = (await c.req.json<{ id?: string }>().catch(() => ({}))) as { id?: string }
  return unsubscribeById(c, body.id || c.req.query('id'))
})

app.get('/api/subscribers', requireAuth, async (c) => {
  const { results } = await c.env.DB.prepare(
    'SELECT id, email, verified, created_at FROM subscribers WHERE active = 1 ORDER BY created_at DESC',
  ).all<{ id: string; email: string; verified: number; created_at: number }>()
  return c.json({
    subscribers: results.map((r) => ({
      id: r.id,
      email: r.email,
      verified: !!r.verified,
      createdAt: new Date(r.created_at * 1000).toISOString(),
    })),
    total: results.length,
  })
})

app.delete('/api/subscribers/:id', requireAuth, async (c) => {
  await c.env.DB.prepare('DELETE FROM subscribers WHERE id = ?').bind(c.req.param('id')).run()
  return c.json({ ok: true })
})

// ==========================================================================
// UPLOAD (R2)
// ==========================================================================

app.post('/api/upload', requireAuth, async (c) => {
  const form = await c.req.formData()
  const file = form.get('file')
  if (!file || typeof file === 'string') return c.json({ error: 'No file uploaded' }, 400)

  const f = file as unknown as File
  const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  if (!allowed.includes(f.type)) return c.json({ error: 'Invalid file type' }, 400)

  const buf = await f.arrayBuffer()
  if (buf.byteLength > 10 * 1024 * 1024) return c.json({ error: 'File too large (max 10MB)' }, 400)

  const ext = (f.name.split('.').pop() || 'bin').toLowerCase()
  const filename = `${randomToken(12)}-${Date.now()}.${ext}`
  await c.env.IMAGES.put(filename, buf, {
    httpMetadata: { contentType: f.type },
  })

  const base = c.env.R2_PUBLIC_URL || new URL(c.req.url).origin + '/img'
  return c.json({ url: `${base}/${filename}` })
})

// Serve R2 objects back through the Worker when no R2_PUBLIC_URL is set.
app.get('/img/:key', async (c) => {
  const key = c.req.param('key')
  const obj = await c.env.IMAGES.get(key)
  if (!obj) return c.notFound()
  const headers = new Headers()
  obj.writeHttpMetadata(headers)
  headers.set('etag', obj.httpEtag)
  headers.set('cache-control', 'public, max-age=31536000, immutable')
  return new Response(obj.body, { headers })
})

// ==========================================================================
// Static frontend fallback — hand everything non-/api and non-/img to ASSETS.
// ==========================================================================

app.all('*', async (c) => {
  const url = new URL(c.req.url)

  if (!isStaticAssetPath(url.pathname)) {
    const routingSettings = await getPublicDomainRoutingSettings(c.env).catch(() => null)
    const customDomain = normalizeStoredHostname(routingSettings?.custom_domain)
    const host = requestHostname(c)

    if (customDomain && isConnectedDomainStatus(routingSettings?.domain_status)) {
      const isCustomDomain = host === customDomain
      const isPublicBlogRoute = isPublicBlogPath(url.pathname)

      if (isCustomDomain && !isPublicBlogRoute) {
        url.pathname = '/blog'
        url.search = ''
        return c.redirect(url.toString(), 302)
      }
    }
  }

  return c.env.ASSETS.fetch(c.req.raw)
})

// ==========================================================================
// Helpers
// ==========================================================================

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

function isStrongPassword(s: string): boolean {
  if (s.length < 12) return false
  if (!/[a-z]/.test(s)) return false
  if (!/[A-Z]/.test(s)) return false
  if (!/[0-9]/.test(s)) return false
  if (!/[^A-Za-z0-9]/.test(s)) return false
  return true
}

async function authPeek(c: AppCtx) {
  const cookie = readSessionCookie(c.req.header('cookie') ?? null)
  if (!cookie) return null
  const secret = await getSessionSecret(c)
  if (!secret) return null
  return verifySessionToken(cookie, secret)
}

export default app
