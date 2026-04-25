# DyeInk Deep Implementation Plan

Date: 2026-04-25

## Goal

Implement the lowest-cost, fastest production architecture for DyeInk without changing the current visual design/look.

Primary direction:
- Keep Cloudflare Workers Static Assets + Hono Worker + D1 + R2.
- Make public traffic static/cache-first.
- Keep D1 as canonical admin/editor storage, not as the public hot path.
- Move view/share event pressure away from D1 when Analytics Engine is available.
- Add clear custom domain deployment guidance.
- Keep every existing route/button working.

## Research Basis

Current primary sources to verify during implementation:
- Cloudflare Workers pricing/static assets: static asset requests are free and unlimited; Worker invocations are billed.
- Cloudflare D1 pricing/limits: D1 bills rows read/written/storage, scales to zero, and supports read replication.
- Cloudflare R2 pricing/public buckets: free egress, custom domain support, production caching via custom domain.
- Workers Analytics Engine: intended for high-volume event analytics.
- Hono: lightweight Web Standards framework suitable for Cloudflare Workers.
- Serverless research papers: serverless works best when compute is stateless and data is platform-native/cache-friendly; avoid per-request state writes on public hot paths.

## Codebase Findings

- `platform/src/App.tsx` currently initializes auth globally, so public visitors trigger setup/auth calls.
- `platform/src/features/blog/Blog.tsx` currently loads all public posts plus full content.
- `backend/src/worker.ts` `/api/posts/public` currently returns `SELECT *`.
- `/api/hit` currently writes to D1 on every view/share.
- Public settings and public posts need cache headers.
- Admin cache exists in `platform/src/stores/adminStore.ts`.
- R2 image support exists, but production custom-domain guidance should be clearer.
- `backend/.env.example` is stale and mentions MongoDB/Auth0/Vercel.
- Empty accidental files exist at repo root: `cd`, `tsc`, `dyeink@4.0.0`, `dyeink-web@4.0.0`.

## Implementation Checklist

- [x] Re-read key app/backend files before editing.
- [x] Re-check current 2026 Cloudflare docs/research before finalizing architecture.
- [x] Split public post list into metadata-only response.
- [x] Use slug detail endpoint for `/blog/:slug` so the list does not ship all full content.
- [x] Keep the visual design unchanged.
- [x] Stop public routes from running auth/setup checks.
- [x] Keep `/`, `/blog`, `/blog/:slug`, `/login`, `/setup`, `/admin`, `/admin/posts`, `/admin/stats`, `/admin/settings`, `/admin/posts/new`, `/admin/posts/:id/edit` working.
- [x] Add public endpoint cache headers/ETags where safe.
- [x] Add generated/static public content support if feasible without breaking current admin flow.
- [x] Add Analytics Engine binding support with D1 fallback for stats events.
- [x] Keep D1 fallback so deployments without Analytics Engine still work.
- [x] Add custom domain “one-click/help” guidance in UI or docs where appropriate.
- [x] Fix stale env documentation.
- [x] Run typecheck/build.
- [x] Smoke-check routes/buttons as much as possible locally.
- [x] Re-read this file after each major execution to avoid missing requirements.

## Implemented

- Public content artifacts are generated into R2 under `public/`.
- Public routes added: `/public/posts.json`, `/public/settings.json`, `/public/posts/:slug.json`.
- Public post list is metadata-only and no longer ships full post content.
- Blog detail fetches one post by slug and uses hover/focus prefetching.
- Public route auth/setup checks were removed; auth initializes only on login/setup/admin paths.
- API/public JSON responses now include cache headers and ETags.
- View/share events write to Workers Analytics Engine when available.
- D1 aggregate rollups remain enabled by default via `D1_HIT_ROLLUPS=on` so the existing Stats dashboard stays populated.
- Settings now includes a Deployment tab with one-click Cloudflare custom domain and R2 bucket/domain links.
- Env examples now match Cloudflare Workers + D1 + R2 + Analytics Engine.
- Empty accidental root files were removed.

## Verification

- `npm run build` passed.
- `cd backend && npm run typecheck` passed.
- Local Worker started with D1, R2, Assets, Analytics Engine, and `D1_HIT_ROLLUPS`.
- Smoke checked `/`, `/blog`, `/login`, `/admin/settings`.
- Smoke checked `/api/setup/status`, `/api/settings`, `/api/posts/public`, `/api/hit`.
- Smoke checked `/public/posts.json`, `/public/settings.json`, `/public/posts/smoke-test-post.json`.
- Confirmed `/public/posts/not-real.json` returns 404.
- Confirmed `/public/posts.json` returns `304 Not Modified` with matching ETag.

## Custom Domain Guidance To Preserve

Best production path:
- Host the live app on Cloudflare Workers with Workers Static Assets.
- Add the custom domain in Cloudflare under the deployed Worker/service custom domains.
- Put the domain DNS on Cloudflare for easiest TLS, WAF, cache, and R2 custom-domain support.
- For uploaded images, attach an R2 custom domain and set `R2_PUBLIC_URL`.
- Avoid `r2.dev` for production; use it only for development.

## Non-Goals

- Do not migrate to Supabase/Neon/Railway/Vercel unless the app becomes a multi-user SaaS.
- Do not redesign the UI.
- Do not add paid third-party auth.
- Do not replace D1 unless its limits are actually hit.

## Follow-Up: Blog Live View Visual Rollback

User request on 2026-04-25:
- The live blog page visuals currently look worse than before.
- Read the previous Git versions from today/yesterday and restore the prior blog UI/visual appearance.
- Keep every optimization and architecture change intact.
- Only change UI/visual structure/styling for the blog live view.
- Re-read this file after each major execution before continuing.

Execution constraints:
- Compare current `platform/src/features/blog/Blog.tsx` against recent Git commits.
- Preserve the new public JSON/R2/cache/prefetch data flow.
- Do not touch backend architecture, deployment config, or public artifact generation unless required by a visual-only compile issue.

Result:
- Restored the older January-style live blog visuals: sticky sidebar, old rounded theme-toggle shell, Jost typography, dashed article dividers, sidebar search, text social links, compact article title/content/share/date layout, and old mobile CSS behavior.
- Kept the optimized public JSON/R2 data path: index still uses metadata-only `/public/posts.json`, detail still uses `/public/posts/:slug.json`, and links still prefetch post detail on hover/focus.
- Did not change backend, Cloudflare config, deployment setup, cache headers, Analytics Engine, D1/R2 logic, or auth routing.

Follow-up verification:
- `npm run build` passed after the visual rollback.
- Local Worker smoke checked `/blog` and `/blog/smoke-test-post` as SPA routes.
- Local Worker smoke checked `/public/posts.json`, `/public/posts/smoke-test-post.json`, `/public/settings.json`, and `/api/hit`.

## Follow-Up: Cloudflare Deploy Analytics Engine Failure

User deploy log on 2026-04-25:
- Build succeeded.
- Asset upload succeeded.
- Worker deploy failed with Cloudflare API code `10089`.
- Cause: `wrangler.toml` required `[[analytics_engine_datasets]]`, but the account has not enabled Analytics Engine.

Fix:
- Removed the default Analytics Engine binding from root `wrangler.toml`.
- Removed the default Analytics Engine binding from `backend/wrangler.toml`.
- Kept optional Analytics Engine support in `backend/src/worker.ts`; it only writes when `env.ANALYTICS` exists.
- Kept `D1_HIT_ROLLUPS = "on"` so Stats keeps working without Analytics Engine.
- Updated env comments to make Analytics Engine optional, not required.

Verification:
- `npm run build` passed after removing the binding.
- `npx wrangler deploy --dry-run` reached `--dry-run: exiting now`.
- Dry-run binding list now contains `DB`, `IMAGES`, `ASSETS`, and `D1_HIT_ROLLUPS`; it no longer contains `ANALYTICS`.
- Wrangler printed a local log-file permission warning for `/Users/subratomandal/Library/Preferences/.wrangler/logs/...`, but the dry-run process exited successfully.
