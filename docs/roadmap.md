# Roadmap

See `ARCHITECTURE.md` §16 for full milestone context. Status tracked here as milestones progress.

- [x] **M0 — Scaffold** — Nx + pnpm workspace, empty `apps/*` and `libs/*`, Husky/lint-staged/commitlint/ESLint/Prettier baseline, Docker Compose, CI pipeline scaffolded.
- [x] **M1 — Foundation** — native auth (email/password + argon2id) and Google SSO, refresh-token rotation with reuse detection, household/member model, Prisma schema + migrations. Dashboard shell with login is still outstanding (see M3).
- [x] **M2 — MVP pipeline** — `domain` event contracts, Gmail connector (heuristic parsing + confidence scoring), rules engine v1 (hardcoded), email digest delivery via Mailhog/SMTP, shared `PipelineService` consumed by both `apps/worker` (BullMQ) and `apps/api` (`POST /internal/pipeline/run`). Verified end to end locally.
- [x] **M3 — Channels & inputs** — WhatsApp Cloud API channel (outbound + signature-verified inbound webhook), manual-entry connector (WhatsApp command grammar), `DocumentsModule` CRUD + expiry-scanning in the pipeline, and the real `apps/web` dashboard (login/signup, overview with activity timeline + digest history, documents with an add form, household settings with invite/join/WhatsApp linking) behind a session-aware layout. Verified end to end: signup through the actual UI flow, document creation, the pipeline digest, and a real cross-browser Playwright smoke test (Chromium/Firefox/WebKit).
- [x] **M4 — Household features** — `TasksModule` (CRUD + a dashboard task board), multi-member households verified with a real owner + invited member, role-based permissions checked against the actual per-household DB membership (not the JWT's household-scoped `role` claim, which doesn't hold once a user belongs to more than one household), and observability polish: a correlation-ID interceptor on every request, and a health check that verifies Redis as well as Postgres.
- [ ] **M5 — Ship it for $0** — free-tier deployment (Vercel + Render + Neon + Upstash), live demo URL.
- [ ] **M6 — Stretch** — rules DSL v2, OCR connector, calendar connector, PWA/mobile-friendly dashboard.
