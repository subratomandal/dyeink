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

## Follow-Up: Blog Visitor UI And Domain UX

User request on 2026-04-25:
- Check whether Cloudflare has Vercel-like one-click custom domain support and inspect previous Vercel/custom-domain implementation from Git history if present.
- In live blog visitor page, blog name should not be clickable.
- In live blog visitor page, remove the `Home` link because this page is for visitors.
- Remove the mail icon from `Subscribe by email`.
- Main blog listing should show a visible content preview, not title-only.
- Preview should show about 3 lines and end with ellipsis for huge text.
- Keep pagination so huge post lists remain paged.
- Fix live blog theme-toggle button to look the same as dashboard.
- Remove the icon from the New Post button.
- Implement properly without changing backend/deploy optimizations.

Execution constraints:
- Read this file before each major execution.
- Preserve R2/public JSON/detail fetch/prefetch optimizations.
- Keep the restored old blog layout, but adjust the requested visitor UX details.

Findings:
- Old Git history (`b9b129c8`) had a Vercel-specific custom domain flow using Vercel project-domain APIs and `cname.vercel-dns.com`.
- Cloudflare Workers supports custom domains through dashboard, Wrangler, and API for domains/zones in the Cloudflare account.
- A Vercel-like customer-domain product on Cloudflare requires Cloudflare for SaaS custom hostnames and a SaaS-zone setup, not just the simple Worker custom-domain binding.

Implemented:
- Live blog name is now plain text, not a link.
- Removed the visitor `Home` link from the live blog sidebar.
- Removed the mail icon from `Subscribe by email`.
- Live blog theme toggle now uses the same direct `ThemeToggle` presentation as the dashboard instead of the old wrapper shell.
- Blog listing now shows a plain-text public `preview` derived from excerpt or post content.
- Preview is clamped to 3 lines with ellipsis and server-truncated with `...` for very long text.
- Public post metadata now includes `preview` and `schemaVersion`.
- Existing stale R2 `public/posts.json` artifacts are detected and refreshed if they do not include the preview schema.
- New Post button no longer imports or renders an icon.
- Settings Deployment copy now explains Cloudflare custom domains versus the old Vercel one-click/API flow and links to Cloudflare for SaaS domain docs.

Verification:
- `cd backend && npm run typecheck` passed.
- `npm run build` passed.
- Local Worker smoke checked `/blog`, `/public/posts.json`, `/public/posts/smoke-test-post.json`, and `/api/hit`.
- `/public/posts.json` returned `schemaVersion: 2` and a `preview` field.

## Follow-Up: GitHub Actions Worker Bundle Dependency Failure

User build failure on 2026-04-25:
- `platform` build finished Vite successfully.
- `node ../scripts/bundle-worker.mjs` failed while bundling `backend/src/worker.ts`.
- esbuild could not resolve `hono` and `hono/cors`.

Cause:
- The GitHub deploy workflow installed platform dependencies and ran the platform build before backend dependencies were installed.
- The platform build is responsible for producing `platform/dist/_worker.js`, so it must have backend Worker dependencies available at bundle time.
- The workflow also referenced `backend/package-lock.json`, but this repo does not have that file.

Fix:
- GitHub Actions now installs the root workspace once with `npm ci --legacy-peer-deps`, using the root `package-lock.json`.
- The separate late backend install step was removed because the root workspace install already installs backend and platform dependencies.
- `scripts/bundle-worker.mjs` now sets `absWorkingDir` to the repo root and explicitly allows module resolution from root, backend, and platform `node_modules`.

Verification:
- `npm ci --legacy-peer-deps --dry-run` passed.
- `npm run build` passed.
- `cd backend && npm run typecheck` passed.

## Follow-Up: GitHub Actions Missing Cloudflare API Token Failure

User deploy failure on 2026-04-25:
- Build and Worker bundling succeeded.
- The next GitHub Actions step failed at `npx wrangler d1 create dyeink`.
- Wrangler reported that `CLOUDFLARE_API_TOKEN` was missing in a non-interactive environment.
- The following `wrangler d1 list --json` returned no JSON, causing `SyntaxError: Unexpected end of JSON input`.

Cause:
- GitHub repository secrets are not available or not configured for `CLOUDFLARE_API_TOKEN` and/or `CLOUDFLARE_ACCOUNT_ID`.
- The workflow attempted Cloudflare provisioning even when those secrets were empty.

Fix:
- Added a `Check Cloudflare deploy credentials` workflow step.
- If either required secret is missing, the workflow now completes the build and skips Cloudflare provisioning/deploy with an explicit warning.
- All Wrangler steps now run only when both Cloudflare secrets are present.
- Hardened D1 database lookup by capturing `wrangler d1 list --json` before parsing and using `set -euo pipefail`, so Wrangler failures do not become misleading JSON parse errors.

Required for real deployment:
- Add GitHub repository secret `CLOUDFLARE_API_TOKEN`.
- Add GitHub repository secret `CLOUDFLARE_ACCOUNT_ID`.

Verification:
- `npm run build` passed.
- `cd backend && npm run typecheck` passed.
- `git diff --check` passed.
- `.github/workflows/deploy.yml` parsed as valid YAML.

## Follow-Up: Proactive GitHub Actions Deploy Hardening

User request on 2026-04-25:
- Solve the next probable deploy errors in the GitHub Actions workflow.

Probable errors addressed:
- Invalid Cloudflare token/account would fail later during D1/R2/deploy with less helpful messages.
- `wrangler d1 create dyeink || true` could hide real permission/API failures.
- `wrangler r2 bucket create dyeink-images || true` could hide real permission/API failures.
- Newly-created Cloudflare resources can take a moment to appear before the next step uses them.
- `wrangler secret put APP_PASSWORD` can fail on a first deployment if it runs before the Worker service exists.
- The comment said `APP_PASSWORD` can be a repository secret, but the workflow only used manual dispatch input.

Fix:
- Added an explicit `npx wrangler whoami --account "$CLOUDFLARE_ACCOUNT_ID"` validation step.
- D1 setup now lists first, creates only when missing, retries after create, and fails clearly if no database id is available.
- R2 setup now checks bucket info first, creates only when missing, retries after create, and fails clearly if the bucket is unavailable.
- Removed `|| true` from D1/R2 provisioning paths so permission/API errors do not get swallowed.
- Moved `APP_PASSWORD` seeding after `wrangler deploy`.
- `APP_PASSWORD` can now come from either manual workflow input or the `APP_PASSWORD` repository secret.

Verification:
- `npm run build` passed.
- `cd backend && npm run typecheck` passed.
- `git diff --check` passed.
- `.github/workflows/deploy.yml` parsed as valid YAML.
- Every workflow `run:` block passed `bash -n`.
