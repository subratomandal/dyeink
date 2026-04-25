# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Frontend (platform/) — React + Vite SPA, dev on :5173
npm run dev            # from repo root → platform dev server
npm run build          # tsc && vite build, outputs platform/dist
npm run preview        # vite preview

# Backend (backend/) — Hono on Cloudflare Workers
cd backend
npm run dev            # wrangler dev (local Worker on :8787, local D1)
npm run build          # wrangler deploy --dry-run --outdir=dist
npm run deploy         # wrangler deploy (real deploy)
npm run db:migrate     # apply D1 migrations to remote
npm run db:migrate:local
```

No lint, no tests. The only automated checks are `tsc --noEmit` (run via `npm run build` in both packages). Run both whenever you touch shared API shapes.

## Architecture

This is an **all-Cloudflare, single-admin personal blog**. One Worker serves both the API and the static SPA. There is no Vercel, no MongoDB, no Auth0, no Railway in this repo — they were removed in favor of one-click Cloudflare deploy.

### Single-Worker layout

`backend/src/worker.ts` is a Hono app with three responsibilities:

1. `/api/*` — JSON routes (auth, posts, settings, stats, subscribers, upload). Bindings: `c.env.DB` (D1), `c.env.IMAGES` (R2)
2. `/img/:key` — proxies an R2 object back to the browser when no `R2_PUBLIC_URL` is configured
3. Anything else — handed to `c.env.ASSETS.fetch(c.req.raw)`, which serves the built SPA from `platform/dist`. The `[assets]` block in `wrangler.toml` wires this up with `not_found_handling = "single-page-application"` so SPA routes resolve correctly on hard reload

Auth helpers live in `backend/src/lib/crypto.ts` — PBKDF2-SHA256 (600 000 iterations) for password hashing, HMAC-SHA256 for session token signing. No native deps; everything goes through Web Crypto. Session cookies are `dyeink_session`, HTTPOnly + Secure + SameSite=Strict, 7-day expiry.

### Single-admin model

There is exactly one administrator per deployment. The `admin` table has `CHECK (id = 1)` to enforce the singleton. Same for `site_settings`. Posts, subscribers, and daily_stats all live under that single admin — no tenancy, no userId joins.

The session secret stored in `admin.session_secret` is rotated on password change, which transparently logs out every other session. There's no separate sessions table.

### Bootstrap flow

1. First request to any `/api/*` route hits `ensureBootstrap` middleware. If the `admin` row is empty and `APP_PASSWORD` is set as a Worker secret, it seeds the admin row from that
2. Otherwise, `GET /api/setup/status` returns `{ initialized: false }` and the SPA's `<Setup>` route prompts the user for a password
3. `POST /api/setup` writes the `admin` row, generates a session secret, and signs them in
4. From then on, `<Login>` is the entry point, and `<Setup>` redirects to `<Login>` if already initialized

### Frontend structure (`platform/`)

- **Stack**: React 18 + Vite + TypeScript + Tailwind CSS + shadcn/ui + Zustand + React Router v6.
- **UI primitives** in `src/components/ui/` are vanilla shadcn (style: new-york, baseColor: zinc). Add more with `npx shadcn@latest add <component>` from `platform/`.
- **Routes**:
  - `/` — public landing (the heavy decorative one with shaders) when not authed; redirects to `/admin` when authed
  - `/blog` and `/blog/:slug` — public blog (sidebar + post list / single post)
  - `/login` — single password form
  - `/setup` — first-run password setup wizard
  - `/admin/*` — protected dashboard, posts, stats, settings, editor
- **Stores**: `authStore` (auth state + setup detection + 401 listener), `themeStore` (dark/light persisted), `adminStore` (cached posts/settings/stats with 5-min TTL)
- **API client**: `src/lib/apiClient.ts` is Axios with `withCredentials: true` for cookie auth. A response interceptor fires a `auth:unauthorized` window event on any 401; `authStore` listens and flips to logged-out, and the router redirects to `/login`
- **Path alias**: `@/*` → `src/*`
- **Decorative components** (LightRays, DecryptedText, PixelCard, ShinyText, NeumorphismButton, GlareHover) are kept intact for the landing/auth/blog visuals. Don't replace these with plain shadcn unless the design changes

### Theming

CSS variables in HSL under `:root` (dark default) and `html[data-theme="light"]`. Legacy named tokens (`--bg-primary`, `--text-primary`, etc.) are kept alongside shadcn HSL tokens for the decorative components. Tailwind's `darkMode` is `['selector', 'html[data-theme="dark"]']`, so `dark:` modifiers only fire when the theme store has explicitly set dark.

### D1 schema

Single migration in `backend/migrations/0001_init.sql`. Tables:
- `admin` (singleton, password hash + session secret)
- `site_settings` (singleton, all blog config)
- `posts` (string `id`, unique `slug`)
- `subscribers` (email + active flag)
- `daily_stats` (post_id × day_utc rollup)
- `login_attempts` (rate-limit bucket; rows expire after 15 min via opportunistic cleanup)

When adding fields, write a new `0002_xxx.sql` rather than editing `0001_init.sql`. `wrangler d1 migrations apply` is a strict forward-only stream.

## Deploy

The README has the user-facing deploy walkthrough. From a maintainer's perspective:

- The root `wrangler.toml` is Workers-specific because Cloudflare's Deploy to Cloudflare flow runs `npx wrangler deploy` from the repo root after `npm run build`
- `[assets].directory = "platform/dist"` is what binds the built SPA into the Worker's `c.env.ASSETS` fetcher
- `backend/wrangler.toml` is still useful for manual backend-local deploys via `cd backend && npm run deploy`
- `wrangler.pages.toml` is a reference config for Git-connected Pages deployments; Pages projects must not run `npx wrangler deploy`
- D1 `database_id` is intentionally omitted in `wrangler.toml`; Wrangler's automatic provisioning creates the database on first deploy, and `ensureSchema` in the Worker initializes tables on first API request
- `.github/workflows/deploy.yml` provisions D1/R2 via `wrangler d1 create` / `wrangler r2 bucket create` (idempotent), patches the temporary checkout with the D1 ID, applies migrations, and deploys. Auto-runs on push to `main`

## Environment

There are no required env vars to run the Worker — config lives in D1.

Optional Worker secrets (set via `wrangler secret put`):
- `APP_PASSWORD` — seeds the admin row on first boot. Skipping this is fine; the setup form handles initialization instead
- `R2_PUBLIC_URL` — if you've attached a custom domain to the R2 bucket, set this so image URLs return your domain. If unset, images route through `/img/<key>` on the Worker itself
- `FRONTEND_ORIGIN` — pins CORS for `/api/*` to a specific origin. Defaults to mirroring the request `Origin` header
