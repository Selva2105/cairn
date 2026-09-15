# Roadmap

See `ARCHITECTURE.md` §16 for full milestone context. Status tracked here as milestones progress.

- [x] **M0 — Scaffold** — Nx + pnpm workspace, empty `apps/*` and `libs/*`, Husky/lint-staged/commitlint/ESLint/Prettier baseline, Docker Compose, CI pipeline scaffolded.
- [ ] **M1 — Foundation** — native auth (email/password + argon2id) and Google SSO, refresh-token rotation, household/member model, Prisma schema + migrations, empty dashboard shell with login.
- [ ] **M2 — MVP pipeline** — `domain` event contracts, Gmail connector, rules engine v1 (hardcoded), email digest delivery via Mailhog/SMTP.
- [ ] **M3 — Channels & inputs** — WhatsApp Cloud API channel, manual-entry connector + dashboard form, document-expiry tracking.
- [ ] **M4 — Household features** — multi-member households, task delegation/assignment, role-based permissions, observability polish.
- [ ] **M5 — Ship it for $0** — free-tier deployment (Vercel + Render + Neon + Upstash), live demo URL.
- [ ] **M6 — Stretch** — rules DSL v2, OCR connector, calendar connector, PWA/mobile-friendly dashboard.
