# Changelog

All notable changes to this project are documented here. Format follows [Keep a Changelog](https://keepachangelog.com/), versioning follows [SemVer](https://semver.org/). Entries are derived from Conventional Commits.

## [Unreleased]

### Added

- M0 scaffold: Nx + pnpm workspace, `apps/{web,api,worker,bot}`, `libs/{domain,auth,rules-engine,notifications,database,ui,connectors/*,shared/*}`, Nx module-boundary enforcement, Docker Compose local infra, Husky/lint-staged/commitlint, CI pipeline.
- M1 foundation: Prisma schema + migrations, native auth (argon2id, JWT, refresh-token rotation with reuse detection) and Google OAuth, household model with JWT-based invites.
- M2 MVP pipeline: Gmail connector, rules engine v1, email notifications, and a shared `libs/pipeline` `PipelineService` consumed by both `apps/worker` (BullMQ) and `apps/api`'s cron-secret-guarded HTTP endpoint.
- Tailwind v3 + shadcn/ui design system (clay/moss theme) wired into `apps/web`.
- M3 backend: `DocumentsModule` CRUD, document-expiry scanning in the pipeline, a WhatsApp Cloud API channel with a signature-verified inbound webhook, and a manual-entry connector driven by a small WhatsApp command grammar.
