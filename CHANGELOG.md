# Changelog

All notable changes to this project are documented here. Format follows [Keep a Changelog](https://keepachangelog.com/), versioning follows [SemVer](https://semver.org/). Entries are derived from Conventional Commits.

## [Unreleased]

### Added

- M0 scaffold: Nx + pnpm workspace, `apps/{web,api,worker,bot}`, `libs/{domain,auth,rules-engine,notifications,database,ui,connectors/*,shared/*}`, Nx module-boundary enforcement, Docker Compose local infra, Husky/lint-staged/commitlint, CI pipeline.
- M1 foundation: Prisma schema + migrations, native auth (argon2id, JWT, refresh-token rotation with reuse detection) and Google OAuth, household model with JWT-based invites.
- M2 MVP pipeline: Gmail connector, rules engine v1, email notifications, and a shared `libs/pipeline` `PipelineService` consumed by both `apps/worker` (BullMQ) and `apps/api`'s cron-secret-guarded HTTP endpoint.
- Tailwind v3 + shadcn/ui design system (clay/moss theme) wired into `apps/web`.
- M3 backend: `DocumentsModule` CRUD, document-expiry scanning in the pipeline, a WhatsApp Cloud API channel with a signature-verified inbound webhook, and a manual-entry connector driven by a small WhatsApp command grammar.
- M3 frontend: the real `apps/web` dashboard -- login/signup, an overview page (activity timeline + digest history), documents (list + add form), and household settings (members, invite/join, WhatsApp number). Added `GET /auth/session` and a minimal `NotificationsModule` read endpoint to support it.
- M4 household features: `TasksModule` (CRUD + dashboard task board), a correlation-ID interceptor on every API request, and a Redis-aware health check.
- M5 deployment prep: `output: 'standalone'` for `apps/web`, the Vercel Cron trigger route (`GET /api/cron/trigger-pipeline`), `vercel.json`, and the Neon pooled/direct (`DATABASE_URL`/`DIRECT_DATABASE_URL`) connection split.

### Fixed

- Household invite generation and task deletion were checking the JWT's `role` claim, which is scoped to whichever household was active at login/refresh and doesn't reflect a user's role in a _different_ household a route references. Both now check the actual per-household membership row instead.
- `Dockerfile.{api,worker,bot}`'s runtime stage ran `pnpm install --prod` against a directory with no `package.json`, silently producing an image with no `node_modules`; now copies `node_modules` from the build stage instead. `Dockerfile.web` referenced `.next/standalone` output that was never actually enabled in `next.config.js`. Both found by building/running the images, not just reading them -- see ADR 0008.
