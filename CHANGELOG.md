# Changelog

All notable changes to this project are documented here. Format follows [Keep a Changelog](https://keepachangelog.com/), versioning follows [SemVer](https://semver.org/). Entries are derived from Conventional Commits.

## [Unreleased]

### Added

- Bill/event review queue: a low-confidence extraction from a fuzzy connector (Gmail, Calendar, OCR) no longer notifies the household directly -- `RulesEngineService.evaluate` routes it to `EventLog.needsReview` instead, and a new `/dashboard/review` page lets a household member approve (dispatches normally) or dismiss (drops it silently) it. Closes the confidence-threshold/review-queue gap tracked in `docs/risk-register.md`.
- `.github/workflows/keep-render-warm.yml`: pings `apps/api`'s `/health` every 10 minutes so Render's free-tier instance doesn't spin down between visits, avoiding the cold-start "loading" delay on the first request after idle time.

### Fixed

- One malformed signal from a connector (an unparseable email, a bad calendar event) aborted every other signal that connector fetched in the same run; now each signal is normalized independently, and only the bad one is skipped and logged.

## [0.1.0] - 2026-09-18

### Added

- M0 scaffold: Nx + pnpm workspace, `apps/{web,api,worker,bot}`, `libs/{domain,auth,rules-engine,notifications,database,ui,connectors/*,shared/*}`, Nx module-boundary enforcement, Docker Compose local infra, Husky/lint-staged/commitlint, CI pipeline.
- M1 foundation: Prisma schema + migrations, native auth (argon2id, JWT, refresh-token rotation with reuse detection) and Google OAuth, household model with JWT-based invites.
- M2 MVP pipeline: Gmail connector, rules engine v1, email notifications, and a shared `libs/pipeline` `PipelineService` consumed by both `apps/worker` (BullMQ) and `apps/api`'s cron-secret-guarded HTTP endpoint.
- Tailwind v3 + shadcn/ui design system (clay/moss theme) wired into `apps/web`.
- M3 backend: `DocumentsModule` CRUD, document-expiry scanning in the pipeline, a WhatsApp Cloud API channel with a signature-verified inbound webhook, and a manual-entry connector driven by a small WhatsApp command grammar.
- M3 frontend: the real `apps/web` dashboard -- login/signup, an overview page (activity timeline + digest history), documents (list + add form), and household settings (members, invite/join, WhatsApp number). Added `GET /auth/session` and a minimal `NotificationsModule` read endpoint to support it.
- M4 household features: `TasksModule` (CRUD + dashboard task board), a correlation-ID interceptor on every API request, and a Redis-aware health check.
- M5 deployment prep: `output: 'standalone'` for `apps/web`, the Vercel Cron trigger route (`GET /api/cron/trigger-pipeline`), `vercel.json`, and the Neon pooled/direct (`DATABASE_URL`/`DIRECT_DATABASE_URL`) connection split.
- M6 stretch: a `RulesModule` (owner-scoped CRUD) backing rules DSL v2 -- a declarative JSON rule format that, once a household configures rules for an event type, replaces the v1 hardcoded rules for it entirely; a Calendar connector (Google Calendar events matched by a maintenance-keyword heuristic); an OCR receipt-scan connector (self-hosted Tesseract.js) plus a new `POST /households/:householdId/receipts/scan` multipart upload endpoint that runs OCR and records a `BillDetected` event on demand, rather than on the cron-polled pipeline; and PWA basics for the dashboard -- a web app manifest, icons, and a network-first service worker.
- Root `package.json` scripts for day-to-day workflow: per-app dev servers, a combined `dev`, Docker Compose helpers (`dev:up`/`dev:down`), Prisma shortcuts, and a `verify` that runs typecheck/lint/test/build across the workspace.

### Fixed

- Household invite generation and task deletion were checking the JWT's `role` claim, which is scoped to whichever household was active at login/refresh and doesn't reflect a user's role in a _different_ household a route references. Both now check the actual per-household membership row instead.
- `Dockerfile.{api,worker,bot}`'s runtime stage ran `pnpm install --prod` against a directory with no `package.json`, silently producing an image with no `node_modules`; now copies `node_modules` from the build stage instead. `Dockerfile.web` referenced `.next/standalone` output that was never actually enabled in `next.config.js`. Both found by building/running the images, not just reading them -- see ADR 0008.
- Cross-domain auth cookies never reached `apps/web`'s server-rendered `getSession()` after Google SSO, silently bouncing every freshly-logged-in user back to `/login` -- fixed by proxying `/api/*` through `apps/web` so the browser only ever talks to one origin; see ADR 0009.
- `.env.example` had duplicate, conflicting `GOOGLE_OAUTH_CLIENT_ID`/`_SECRET`/`_CALLBACK_URL` entries (the second `GOOGLE_OAUTH_CALLBACK_URL` was missing the `/api` prefix ADR 0009 requires); deduplicated into one consistent block.
- Render deploy used `SameSite=Lax` cookies and did not force `NODE_ENV=production`, breaking session persistence in production; now forces `NODE_ENV=production` on Render and uses `SameSite=None` (with `Secure`) for cross-site-safe cookies.

### Added (infra)

- `apps/web/src/app/privacy` and `.../terms` -- public privacy policy and terms of service pages, linked from login/signup, needed for Google OAuth consent screen verification.
- `apps/web/src/app/changelog` -- a public changelog page rendering this file's release history.
