# AGENTS.md

## Cursor Cloud specific instructions

DyeInk is a single deployable Cloudflare Worker (Hono API + D1 + R2) that also serves a React/Vite SPA. It is an npm-workspaces monorepo with two workspaces: `backend/` (the Worker/API) and `platform/` (the SPA). See `README.md` for the full command list; the notes below capture only non-obvious gotchas.

### Services and how to run them
- Backend Worker (required): `cd backend && npm run dev` (or `npm run dev:worker` from root) → `http://127.0.0.1:8787`. `wrangler dev` runs Miniflare, which emulates D1 and R2 locally with no external services or credentials. `wrangler dev` also auto-runs the SPA build (the `[build]` command in `backend/wrangler.toml`) before serving, so the Worker alone can serve the whole app end-to-end.
- Frontend Vite dev (optional, for hot-reload UI work): `cd platform && npm run dev` (or `npm run dev` from root) → `http://localhost:5173`. Run both together with `npm run dev:all` from root.

### Non-obvious gotchas
- The Vite dev server binds to `localhost` only. Use `http://localhost:5173` — `http://127.0.0.1:5173` will refuse the connection.
- The Vite dev server proxies `/api` and `/img` to the Worker on `:8787`. The admin dashboard and all API calls only work if the backend Worker is also running; start it first (or use `dev:all`).
- No env vars or Cloudflare credentials are required for local dev. All external integrations (email/newsletter, custom-domain automation, Analytics Engine) are optional feature flags and are off by default.
- The D1 schema is auto-created on the first API request; no manual migration is needed for local dev (`npm run db:migrate:local` is optional).
- Local D1/R2 state persists under `backend/.wrangler/` (gitignored). The first-run setup wizard is disabled once an admin exists — to reset to a fresh install, delete `backend/.wrangler/` and restart the Worker.
- There is no ESLint config; the lint-equivalent check is `npm run typecheck` (runs `tsc --noEmit` in both workspaces).
