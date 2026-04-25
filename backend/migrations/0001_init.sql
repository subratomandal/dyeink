-- DyeInk initial schema.
-- D1 is SQLite under the hood, so this is standard SQL with a few SQLite-isms.
-- Applied by: wrangler d1 migrations apply dyeink

-- Singleton admin. Exactly one row. The password is PBKDF2-SHA256.
-- Stored as: "pbkdf2$<iter>$<salt_b64>$<hash_b64>".
CREATE TABLE IF NOT EXISTS admin (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  password_hash TEXT NOT NULL,
  session_secret TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Blog settings. Also singleton (single-admin deployment).
CREATE TABLE IF NOT EXISTS site_settings (
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
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS posts (
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
);

CREATE INDEX IF NOT EXISTS idx_posts_published ON posts(published, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_created ON posts(created_at DESC);

CREATE TABLE IF NOT EXISTS subscribers (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  verified INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Rollup table for the 7-day graph. Key is (post_id, day_utc).
CREATE TABLE IF NOT EXISTS daily_stats (
  post_id TEXT NOT NULL,
  day_utc INTEGER NOT NULL,
  views INTEGER NOT NULL DEFAULT 0,
  shares INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (post_id, day_utc),
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
);

-- Rate-limit bucket for /auth/login. Rows expire after 15 min.
CREATE TABLE IF NOT EXISTS login_attempts (
  ip TEXT NOT NULL,
  attempted_at INTEGER NOT NULL,
  success INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_login_attempts_ip ON login_attempts(ip, attempted_at);
