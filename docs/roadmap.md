# Roadmap

See `ARCHITECTURE.md` §16 for full milestone context. Status tracked here as milestones progress.

- [x] **M0 — Scaffold** — Nx + pnpm workspace, empty `apps/*` and `libs/*`, Husky/lint-staged/commitlint/ESLint/Prettier baseline, Docker Compose, CI pipeline scaffolded.
- [x] **M1 — Foundation** — native auth (email/password + argon2id) and Google SSO, refresh-token rotation with reuse detection, household/member model, Prisma schema + migrations. Dashboard shell with login is still outstanding (see M3).
- [x] **M2 — MVP pipeline** — `domain` event contracts, Gmail connector (heuristic parsing + confidence scoring), rules engine v1 (hardcoded), email digest delivery via Mailhog/SMTP, shared `PipelineService` consumed by both `apps/worker` (BullMQ) and `apps/api` (`POST /internal/pipeline/run`). Verified end to end locally.
- [ ] **M3 — Channels & inputs** — WhatsApp Cloud API channel, manual-entry connector + dashboard form, document-expiry tracking, the real `apps/web` dashboard (currently a single theme smoke-test page).
- [ ] **M4 — Household features** — multi-member households, task delegation/assignment, role-based permissions, observability polish.
- [ ] **M5 — Ship it for $0** — free-tier deployment (Vercel + Render + Neon + Upstash), live demo URL.
- [ ] **M6 — Stretch** — rules DSL v2, OCR connector, calendar connector, PWA/mobile-friendly dashboard.
