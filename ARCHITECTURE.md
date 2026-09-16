# Cairn — Architecture & Project Setup Guide

**Household Operations Platform — a self-hosted, event-driven system that watches for the small signals of household/personal life (renewing bills, expiring documents, overdue maintenance, buried action items) and routes them to the right person through the right channel, before they become emergencies.**

> **On the name:** a cairn is a small stack of stones left on a trail to mark the way and warn you before you go astray — a fitting metaphor for a system that leaves markers for the things about to go wrong in your household. Rename freely; other options that fit the same territory: **Vigilo** (Latin, "I watch"), **Warden**, **Almanac**, **Threshold**.

This document is both a design spec and a build plan. Keep it at the root of the repo (as `ARCHITECTURE.md`) and treat it as the source of truth for decisions — update it as ADRs get written and milestones ship. It's also written to be fed to an AI coding agent (Claude Code or similar) a milestone at a time, so the agent builds incrementally against a stable spec rather than improvising architecture as it goes.

---

## 1. Product Brief (recap)

**Problem:** Hectic daily life isn't usually a task-list problem — it's a _noticing_ problem. You don't miss a bill because you lack a place to track it; you miss it because nothing tells you it's due until it's late. Generic todo apps assume you already know what needs doing.

**Solution:** Cairn ingests messy, heterogeneous signals — forwarded emails, calendar events, manually logged events, scanned receipts/documents — normalizes them into domain events, evaluates them against a rules engine, and delivers timely alerts through whichever channel you'll actually see (daily digest email, WhatsApp, dashboard).

**MVP scope:** one connector (Gmail bill/subscription detection), a hardcoded rules engine, one delivery channel (daily digest email). Everything else is roadmap (see §17) — which is what gives the project a real milestone-by-milestone story for interviews.

---

## 2. What This Project Is Meant to Prove

| Area                   | What it demonstrates                                                                                                                                                                                                                                                                       | Where in this doc                |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------- |
| **Architecture**       | Event-driven design, plugin/connector abstraction, idempotency & retry handling, clean separation of ingestion / domain / delivery, monorepo dependency design enforced by Nx module boundaries, trigger-agnostic pipeline (queue consumer locally, cron-triggered function in production) | §5, §6, §9, §10, §13, §17.3, §18 |
| **Coding**             | Strict typing across a real monorepo, testing pyramid, design patterns used deliberately (Strategy, Observer, Chain of Responsibility), naming conventions, zero magic-string discipline, CI quality gates                                                                                 | §14, §15, §17, §18               |
| **Project management** | ADRs, RFC process, milestone/epic roadmap, issue/PR discipline, risk register, changelog & semver                                                                                                                                                                                          | §16, §17                         |

Be able to explain _why_, not just _what_, for every item in this table — that's what separates this from a tutorial project in an interview.

---

## 3. Tech Stack

| Layer                     | Choice                                                                                                                                              | Why                                                                                                                                                                                                                                                                                              |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Frontend                  | **Next.js (App Router) + React + TypeScript**                                                                                                       | Dashboard UI, server components for data-heavy views, API routes only for BFF concerns (real domain logic stays in NestJS).                                                                                                                                                                      |
| UI kit                    | **Tailwind CSS + shadcn/ui**                                                                                                                        | Fast, accessible, ownable components (not a black-box UI library) — good for a shared `libs/ui`.                                                                                                                                                                                                 |
| Backend API               | **NestJS**                                                                                                                                          | Modular, DI-based, first-class support for guards/interceptors/pipes — gives you a legitimate reason to talk about layered architecture (controllers → services → repositories) instead of one big Express file.                                                                                 |
| Workers                   | **NestJS microservice (or standalone Node worker) + BullMQ**                                                                                        | Hosts connectors and the rules engine; consumes queued jobs, isolated from the request/response API process.                                                                                                                                                                                     |
| Database                  | **PostgreSQL** (Docker) + **Prisma ORM**                                                                                                            | Relational fits the domain (households, users, documents, bills, tasks, events) well; Prisma gives you migrations + type-safe queries.                                                                                                                                                           |
| Event bus / queue         | **Redis + BullMQ**                                                                                                                                  | Deliberately _not_ Kafka — write the ADR explaining that a single-tenant household system doesn't need partitioned log semantics, and Redis Streams/BullMQ gives you pub/sub + reliable job queues with far less operational weight. This restraint is itself a good architecture talking point. |
| Auth                      | **Native auth in NestJS** — email/password with argon2id hashing + rotating JWT (access/refresh), plus **Google SSO** via `passport-google-oauth20` | No NextAuth.js — the API is the single authority that issues and validates tokens for web, bot, and any future client, instead of splitting session logic across two frameworks. See §10.                                                                                                        |
| Notifications             | **WhatsApp Cloud API (Meta), Nodemailer, Web Push (stretch)**                                                                                       | Channel abstraction package — each is a pluggable adapter. WhatsApp Cloud API direct from Meta (not Twilio) gives a free test business number that can message up to 5 verified recipient numbers at no cost — plenty for a household-scale demo. See §18.                                       |
| Monorepo tooling          | **Nx + pnpm workspaces**                                                                                                                            | Project graph + `nx affected` (only build/test/lint what actually changed), enforced module boundaries via tags (§17.3), built-in generators for scaffolding new libs/connectors (§17.7) — more architecture-discipline mileage than Turborepo for a project meant to showcase system design.    |
| Containers                | **Docker + Docker Compose** (local), Dockerfile per app                                                                                             | Postgres, Redis, Mailhog (local email capture), Adminer as local infra services.                                                                                                                                                                                                                 |
| Observability             | **pino (structured logs)** + **OpenTelemetry** (traces across API → queue → worker)                                                                 | Correlate a single event across process boundaries — this is the detail that proves you understand distributed systems, not just CRUD.                                                                                                                                                           |
| Testing                   | **Vitest/Jest, Supertest, Playwright, Testcontainers**                                                                                              | Unit → integration → e2e pyramid, see §13.                                                                                                                                                                                                                                                       |
| Git hooks / quality gates | **Husky + lint-staged + commitlint**                                                                                                                | Pre-commit lint/format on staged files, commit-msg enforces Conventional Commits, pre-push runs `nx affected`. See §17.4.                                                                                                                                                                        |
| CI/CD                     | **GitHub Actions** using `nx affected` + Nx remote caching                                                                                          | Lint → typecheck → test → build → deploy `apps/web` to Vercel and `apps/api` to Render, both free tiers — see §18 for the full $0 deployment topology.                                                                                                                                           |

---

## 4. High-Level Architecture

```
                     ┌───────────────────────────────────────────┐
                     │                 apps/web                  │
                     │        Next.js dashboard (React)          │
                     └───────────────┬─────────────────────────--┘
                                     │ REST/GraphQL
                                     ▼
┌────────────┐        ┌───────────────────────────┐        ┌──────────────┐
│  apps/bot  │◄──────► │         apps/api          │◄──────►│  PostgreSQL  │
│ (WhatsApp) │  cmds   │  NestJS — auth, household, │  Prisma│              │
└────────────┘         │  CRUD, dashboard BFF       │        └──────────────┘
                        └───────────┬───────────────┘
                                    │ publishes commands / reads events
                                    ▼
                        ┌───────────────────────────┐
                        │        Redis (BullMQ)      │  ← event bus + job queues
                        └───────────┬───────────────┘
                                    ▼
                        ┌───────────────────────────┐
                        │        apps/worker         │
                        │  NestJS worker service     │
                        │                             │
                        │  Connectors → Normalize →   │
                        │  Domain Events → Rules      │
                        │  Engine → Notification Jobs │
                        └───────────┬───────────────┘
                                    ▼
                        ┌───────────────────────────┐
                        │    libs/notifications      │
                        │  WhatsApp / Email / Push   │
                        └───────────────────────────┘
```

**Pipeline, in words:**

1. **Connectors** (each a self-contained Nx lib implementing a common interface) pull or receive raw input — a Gmail scan, a calendar sync, a manual log entry, a photographed receipt.
2. **Normalization** turns every connector's raw output into a typed **domain event** (`BillDetected`, `DocumentExpiring`, `MaintenanceDue`, `TaskExtracted`) validated against a shared schema in `libs/domain`.
3. **Rules engine** evaluates each event against household-configured rules and emits **actions** (create a reminder, notify a member, escalate).
4. **Delivery** dispatches actions through a channel adapter (email digest, WhatsApp message, push notification, dashboard).

Every hop happens through the queue, not a direct function call — that's what forces (and justifies) idempotency, retries, and dead-letter handling instead of hand-waving them.

---

## 5. Monorepo Layout

```
cairn/
├── apps/
│   ├── web/                    # Next.js dashboard
│   ├── api/                    # NestJS REST API — auth (native + Google SSO), household mgmt, CRUD, BFF
│   ├── worker/                 # NestJS worker — connectors, rules engine, queue consumers
│   ├── bot/                    # NestJS microservice — WhatsApp webhook + outbound gateway
│   └── */e2e/                  # Playwright e2e project per app (Nx convention)
├── libs/
│   ├── domain/                  # Shared TS types + zod schemas: events, commands, entities
│   ├── auth/                    # Native auth + Google SSO: strategies, guards, token service (shared api/bot)
│   ├── connectors/
│   │   ├── gmail/                # Bill/subscription detection from forwarded/labelled email
│   │   ├── calendar/             # Upcoming-event ingestion (Google Calendar)
│   │   ├── manual-entry/         # Direct API/bot-driven event creation
│   │   └── ocr/                  # Receipt/document photo → structured data (stretch)
│   ├── rules-engine/             # Rule evaluation core (v1: hardcoded, v2: declarative DSL)
│   ├── notifications/            # Channel adapters: email, whatsapp, push
│   ├── database/                 # Prisma schema, migrations, generated client
│   ├── ui/                       # Shared shadcn/tailwind component library
│   └── shared/
│       ├── constants/             # Centralized exportable string/config constants — §17.2
│       ├── config/                 # zod-validated env schema, typed config service — §17.6
│       └── utils/                  # Pure helpers (formatting, hashing, date math)
├── tools/
│   └── generators/
│       └── connector/              # Custom Nx generator: `nx g @cairn/tools:connector <name>` — §17.7
├── infra/
│   ├── docker/
│   │   ├── docker-compose.yml
│   │   ├── Dockerfile.api
│   │   ├── Dockerfile.web
│   │   ├── Dockerfile.worker
│   │   └── Dockerfile.bot
│   └── github/
│       └── workflows/
│           └── ci.yml
├── docs/
│   ├── adr/                     # Architecture Decision Records
│   ├── rfcs/                    # Larger proposed changes
│   ├── CODING_STANDARDS.md      # §17, extracted as its own file for quick reference
│   └── roadmap.md
├── .husky/
│   ├── pre-commit                # lint-staged
│   ├── commit-msg                 # commitlint
│   └── pre-push                   # nx affected -t lint,test
├── nx.json
├── tsconfig.base.json
├── .eslintrc.json                # base config + @nx/enforce-module-boundaries
├── .prettierrc
├── .editorconfig
├── commitlint.config.js
├── pnpm-workspace.yaml
├── package.json
└── ARCHITECTURE.md              # this file
```

**Dependency direction (enforce this, it's a real design decision):** `apps/*` depend on `libs/*`; `libs/*` never depend on `apps/*`; `connectors/*` and `notifications/*` depend on `domain` and `shared/*` only, never on each other. In Nx this isn't just a convention you hope people follow — it's enforced at lint time via tagged module boundaries (§17.3), which is what makes the monorepo choice defensible rather than cosmetic: you can point to a failing CI check, not just a diagram, when explaining why a connector can't reach into the API layer.

---

## 6. Domain Model & Event Contracts

`libs/domain` is the single source of truth for cross-service types. Every event is validated with `zod` at the boundary (connector output, queue consumption) so a malformed payload fails loudly instead of corrupting downstream state.

```ts
// libs/domain/src/lib/events.ts
type BaseEvent = {
  id: string; // uuid
  householdId: string;
  occurredAt: string; // ISO timestamp
  source: 'gmail' | 'calendar' | 'manual' | 'ocr';
  dedupeKey: string; // hash used for idempotency
};

type BillDetected = BaseEvent & {
  type: 'BillDetected';
  payload: {
    vendor: string;
    amount: number;
    currency: string;
    dueDate: string;
    isRecurring: boolean;
  };
};

type DocumentExpiring = BaseEvent & {
  type: 'DocumentExpiring';
  payload: {
    documentType: 'passport' | 'insurance' | 'warranty' | 'registration';
    expiresOn: string;
  };
};

type MaintenanceDue = BaseEvent & {
  type: 'MaintenanceDue';
  payload: { asset: string; task: string; dueOn: string };
};

type TaskExtracted = BaseEvent & {
  type: 'TaskExtracted';
  payload: { description: string; assigneeId?: string; dueOn?: string };
};

export type DomainEvent =
  BillDetected | DocumentExpiring | MaintenanceDue | TaskExtracted;
```

Core entities in Postgres/Prisma: `Household`, `User` (with `HouseholdMember` join + role), `Document`, `Bill`, `Task`, `Rule`, `EventLog` (append-only record of every domain event, useful for debugging and for an "activity timeline" dashboard feature), `Notification`.

---

## 7. Service Responsibilities

- **`apps/api`** — auth, household/member management, CRUD for documents/bills/tasks, exposes REST (or GraphQL) to the dashboard, publishes commands onto the queue, never talks to connectors directly.
- **`apps/worker`** — hosts the connector registry, runs on a schedule (cron) or webhook trigger per connector, normalizes output into domain events, persists to `EventLog`, runs the rules engine, enqueues notification jobs.
- **`apps/bot`** — thin WhatsApp gateway: verifies and handles Meta's webhook callbacks, translates inbound WhatsApp messages into commands against the API, and renders outbound notification jobs as WhatsApp messages via the Cloud API. (In the free deployment, §18 folds this into `apps/api` as a couple of extra controllers rather than a separate service — noted there.)
- **`apps/web`** — dashboard: household overview, digest history, manual entry forms, rule configuration UI, task board.

---

## 8. Connector Plugin Architecture

Every connector implements a common interface (Strategy pattern):

```ts
// libs/domain/src/lib/connector.ts
export interface Connector {
  key: string; // 'gmail', 'calendar', ...
  schedule: 'cron' | 'webhook';
  fetch(context: ConnectorContext): Promise<RawSignal[]>;
  normalize(raw: RawSignal): DomainEvent;
}
```

The worker holds a **registry** it iterates over — adding a new source means adding a new lib and registering it, not modifying worker internals. This is the detail to walk through in an interview when asked "how would you add a new data source without a rewrite." (And in this repo, adding one is literally `nx g @cairn/tools:connector <name>` — see §17.7.)

**Idempotency:** every event carries a `dedupeKey` (hash of source + external ID + relevant fields). The worker checks `EventLog` before processing — a bill parsed twice from a re-synced mailbox must not fire two reminders. This single requirement is what justifies treating the pipeline as "at-least-once delivery, exactly-once effect" rather than hand-waving reliability.

---

## 9. Rules Engine

**v1 (MVP):** hardcoded TypeScript rule functions per event type — simple, testable, ships fast. Example: "if `DocumentExpiring.expiresOn` is within 30 days, create a `HighPriorityReminder` action."

**v2 (roadmap):** a small declarative rule format households can configure themselves, e.g.:

```json
{
  "id": "rule-doc-expiry-30d",
  "on": "DocumentExpiring",
  "when": { "daysUntil": { "field": "payload.expiresOn", "lte": 30 } },
  "then": [{ "action": "notify", "channel": "digest", "priority": "high" }]
}
```

Document the v1 → v2 migration as an ADR — evolving from hardcoded logic to a DSL under real constraints is a stronger story than building the DSL first and never justifying it.

---

## 10. Auth & Household Model

Auth is native — built directly in NestJS (`libs/auth`), with no NextAuth.js in the loop. The reasoning worth stating explicitly (and worth its own ADR, `0004-auth-strategy.md`): `apps/api` is the **single authority** that issues and validates tokens for every client — web, bot, and anything added later — instead of splitting session logic between a Next.js auth layer and a separate API. It's more code to write than dropping in NextAuth, and that's the point: it's the part of the project that actually demonstrates you can build auth, not just configure it.

**Password auth:**

- Signup/login endpoints in `apps/api`, passwords hashed with **argon2id** (not bcrypt — argon2id is the current recommended default and is itself a small, explainable decision).
- Email verification token flow (stretch) before a password-auth account is fully active.

**Google SSO:**

- OAuth 2.0 Authorization Code flow via `passport-google-oauth20`, implemented as a NestJS Passport strategy inside `libs/auth` — the API owns the entire flow.
- Web app redirects the browser to `GET /auth/google`; API handles `GET /auth/google/callback`, verifies the Google identity, upserts the `User` (matched by verified email), and issues Cairn's own tokens — Google is only ever used to prove identity, never as the session mechanism itself.
- First-time Google sign-in with no existing household creates one; an existing email links the Google identity to the existing account rather than creating a duplicate user.

**Tokens & sessions:**

- Short-lived **access token** (JWT, ~15 min) carrying `sub` (user id), `householdId`, and `role`, sent as an `httpOnly`, `secure`, `sameSite=lax` cookie — never exposed to client-side JS.
- Longer-lived **refresh token**, stored **hashed** in a `RefreshToken` table (`jti`, `userId`, `hashedToken`, `expiresAt`, `revokedAt`) with **rotation on every use** and **reuse detection**: if a refresh token is presented twice, the entire token family is revoked and the user is forced to re-authenticate. This one mechanism is worth more in an interview than naming any auth library — it shows you understand _why_ refresh tokens get stolen and replayed, not just that they exist.
- `apps/bot` validates the same access token format via a shared guard from `libs/auth`, so there's exactly one JWT verification implementation in the whole system.

**Household model:**

- `Household` is the top-level tenant boundary; every domain row is scoped by `householdId`.
- `HouseholdMember` join table carries a `role` (`owner` | `member`) — owners manage rules/connectors, members see the dashboard and get assigned tasks.
- Invite flow: owner generates an invite link/code → new user signs up (password or Google) → joins household as `member`.

**Guards (NestJS):** `JwtAuthGuard` (valid access token required) → `HouseholdRoleGuard` (role check, e.g. `@Roles('owner')`) → controller. Both live in `libs/auth` and are imported wherever they're needed, never re-implemented per module.

---

## 11. Local Development Setup

**`infra/docker/docker-compose.yml`** services:

```yaml
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_USER: cairn
      POSTGRES_PASSWORD: cairn
      POSTGRES_DB: cairn
    ports: ['5432:5432']
    volumes: ['pgdata:/var/lib/postgresql/data']

  redis:
    image: redis:7
    ports: ['6380:6379'] # host 6380 -- avoids clashing with another local project's Redis on 6379

  mailhog: # local SMTP capture for testing digest emails
    image: axllent/mailpit # mailhog/mailhog is amd64-only/unmaintained; mailpit is a maintained, multi-arch drop-in
    ports: ['11025:1025', '18025:8025'] # host 11025/18025 for the same reason

  adminer: # quick DB browser
    image: adminer
    ports: ['8080:8080']

volumes:
  pgdata:
```

**Bootstrap steps:**

```bash
pnpm install
docker compose -f infra/docker/docker-compose.yml up -d
cp .env.example .env            # fill in Google OAuth creds, WhatsApp Cloud API credentials, JWT secrets, etc.
pnpm nx run database:migrate    # Prisma migrate dev, wrapped as an Nx target
pnpm nx run-many -t serve -p web,api,worker,bot --parallel   # runs all four apps together
```

`.env.example` should cover: `DATABASE_URL`, `REDIS_URL` (`redis://localhost:6380` locally — remapped from Redis's default 6379 to avoid clashing with another local project), `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `GOOGLE_OAUTH_CALLBACK_URL`, `COOKIE_DOMAIN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_VERIFY_TOKEN` (a string you choose, used in Meta's webhook handshake), `WHATSAPP_APP_SECRET` (used to verify Meta's `X-Hub-Signature-256` on every inbound webhook — don't skip this check, it's what stops anyone from POSTing fake messages to your endpoint), `SMTP_HOST`/`SMTP_PORT` (Mailhog locally, on host port 11025 for the same reason). All of it is validated at boot via the zod schema in `libs/shared/config` (§17.6) — a missing or malformed var fails startup immediately with a clear message instead of surfacing as a mystery 500 later.

**Testing the WhatsApp webhook locally:** Meta needs a public HTTPS URL to send webhook callbacks to, which `localhost` isn't. Tunnel your local `apps/api` with a free tool — **ngrok** (free tier, random URL that changes per session, fine for dev) or a **Cloudflare Tunnel** (free, stable subdomain if you want one) — and point Meta's App Dashboard webhook config at the tunnel URL while developing.

---

## 12. Observability & Failure Handling

- **Structured logging** (pino) with a `correlationId` generated at ingestion and threaded through every log line for that event, across API → queue → worker → notification — this is what lets you demonstrate tracing a single event's lifecycle end to end.
- **OpenTelemetry** spans across the same boundary, exported to a local Jaeger/Grafana Tempo container for a demo, or console exporter if you want to keep infra light.
- **Health endpoints** (`/health`) per service (DB connectivity, Redis connectivity).
- **Retry/backoff**: BullMQ's built-in exponential backoff for job retries; failed jobs after N attempts move to a dead-letter queue, surfaced on the dashboard as "needs attention" rather than silently dropped.

---

## 13. Testing Strategy

| Level       | Scope                                                                                                                        | Tooling                                   |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| Unit        | Rules engine logic, connector `normalize()` functions, dedupe hashing                                                        | Vitest/Jest                               |
| Contract    | Every connector satisfies the `Connector` interface with fixed fixture inputs                                                | Vitest + shared fixtures in `libs/domain` |
| Integration | API endpoints against a real (containerized) Postgres                                                                        | Supertest + Testcontainers                |
| E2E         | Full pipeline smoke test: seed a fake email → worker processes → digest email captured in Mailhog → dashboard shows the item | Playwright                                |

A green CI run that includes a real end-to-end pipeline test (not just UI clicks) is one of the stronger single artifacts you can point to.

---

## 14. CI/CD

GitHub Actions pipeline (`infra/github/workflows/ci.yml`):

1. Install (pnpm, cached) → 2. `nx affected -t lint` → 3. `nx affected -t typecheck` → 4. `nx affected -t test` (with a Postgres/Redis service container) → 5. `nx affected -t build` (Nx remote cache) → 6. Build & push Docker images (on `main`, for local/self-hosted use) → 7. Deploy `apps/web` to Vercel and `apps/api` to Render on merge to `main` — the free, $0 topology detailed in §18.

Running everything through `nx affected` means a PR that only touches `libs/connectors/gmail` doesn't re-lint/re-test/re-build the entire monorepo — CI time scales with the size of the change, not the size of the repo, which is a real, demonstrable benefit of Nx over a flat script setup.

Branch protection: require the pipeline green + one review (even self-review with a checklist) before merge to `main`. The same commitlint config used in the local `commit-msg` hook (§17.4) is worth re-checking in CI too, so a bypassed local hook doesn't slip through. Conventional Commits let you generate a changelog automatically (`changesets` or `semantic-release`).

---

## 15. Project Management Artifacts

This is the section that makes the difference on a resume with no formal PM title — these are real artifacts to keep in the repo, not decoration:

- **`docs/adr/`** — one file per significant decision, numbered. Seed list to write as you build:
  - `0001-monorepo-tooling.md` — Nx vs Turborepo
  - `0002-event-bus-choice.md` — Redis/BullMQ vs Kafka/RabbitMQ
  - `0003-rules-engine-v1-vs-dsl.md` — hardcoded rules now, DSL later, and why
  - `0004-auth-strategy.md` — native auth + Google SSO vs NextAuth/Auth0, and the refresh-token rotation design
  - `0005-connector-plugin-interface.md` — the `Connector` contract and why it's shaped that way
  - `0006-constants-and-naming-conventions.md` — why strings are centralized as `as const` objects instead of scattered literals or TS `enum`
  - `0007-messaging-channel-choice.md` — WhatsApp Cloud API (direct from Meta) vs. Telegram vs. Twilio, and why the free test-number tier is enough for this project's scope
  - `0008-deployment-topology.md` — why the live deployment splits across Vercel/Render/Neon/Upstash instead of one host, and how a cron-triggered function stands in for the always-on BullMQ worker at zero cost (§18)
- **`docs/rfcs/`** — for changes big enough to want a written proposal before code (e.g., "Rules DSL v2 design", "Multi-household sharing model").
- **`docs/CODING_STANDARDS.md`** — the content of §17 below, lifted into its own file so it's the first thing a reviewer (or an AI coding agent) finds.
- **GitHub Projects board** — columns `Backlog / Ready / In Progress / In Review / Done`, issues grouped under milestone epics (see §16). Use issue templates (`bug_report.md`, `feature_request.md`) and a PR template with a checklist (tests added, types checked, docs/ADR updated if a decision changed).
- **Changelog** (`CHANGELOG.md`) driven by Conventional Commits + semantic versioning (`v0.1.0` at MVP, etc.).
- **Risk register** (`docs/risk-register.md`) — a short table is enough: e.g. "Gmail API rate limits could throttle connector → mitigate with backoff + polling interval config"; "Email parsing false positives could misclassify a bill → mitigate with confidence threshold + manual review queue"; "Refresh token theft → mitigate with rotation + reuse detection (§10)."

---

## 16. Roadmap / Milestones

Treat each milestone as a sprint with a handful of user stories — this becomes your commit/PR narrative.

- **M0 — Scaffold:** Nx + pnpm workspace, empty `apps/*` and `libs/*`, Husky/lint-staged/commitlint/ESLint/Prettier baseline, Docker Compose up, CI pipeline green on an empty build.
- **M1 — Foundation:** native auth (email/password + argon2id) and Google SSO, refresh-token rotation, household/member model, Prisma schema + migrations, empty dashboard shell with login.
- **M2 — MVP pipeline:** `domain` event contracts, Gmail connector, rules engine v1 (hardcoded), email digest delivery via Mailhog/SMTP. _This milestone alone is a demoable product._
- **M3 — Channels & inputs:** WhatsApp Cloud API channel (webhook receiver + outbound sender), manual-entry connector + dashboard form, document-expiry tracking.
- **M4 — Household features:** multi-member households, task delegation/assignment, role-based permissions, observability polish (correlation IDs, health checks, dead-letter surfacing).
- **M5 — Ship it for $0:** free-tier deployment (§18) — Vercel + Render + Neon + Upstash, live demo URL, WhatsApp webhook pointed at the deployed API.
- **M6 — Stretch:** rules DSL v2, OCR connector, calendar connector, PWA/mobile-friendly dashboard.

---

## 17. Coding Standards & Repo Hardening

This is the section that makes the repo _read_ as maintained by someone with standards, not a solo weekend project — pick what fits your time budget, but §17.1–§17.4 are worth doing in full since they're cheap and visible in every commit.

### 17.1 Naming Conventions

**Files:**

| Kind             | Convention                                                  | Example                                                                                                                                                    |
| ---------------- | ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| NestJS artifacts | kebab-case + type suffix (Nest convention)                  | `bill.controller.ts`, `bill.service.ts`, `bill.module.ts`, `create-bill.dto.ts`, `bill-detected.event.ts`, `google-oauth.strategy.ts`, `jwt-auth.guard.ts` |
| React components | PascalCase, filename matches export                         | `HouseholdCard.tsx`, colocated `HouseholdCard.test.tsx`                                                                                                    |
| Hooks            | camelCase, `use` prefix                                     | `useHouseholdMembers.ts`                                                                                                                                   |
| Plain utilities  | kebab-case                                                  | `format-currency.ts`, `hash-dedupe-key.ts`                                                                                                                 |
| Nx libs/apps     | kebab-case, matches `project.json` name and import path     | `libs/connectors/gmail` → `@cairn/connectors-gmail`                                                                                                        |
| Tests            | mirror source filename, `.spec.ts` (unit) or `.e2e-spec.ts` | `bill.service.spec.ts`                                                                                                                                     |

Every lib exposes exactly one `index.ts` barrel as its public API — nothing outside the lib imports its internals directly. This is enforced structurally, not just by convention (§17.3).

**Identifiers:**

- Variables & functions: `camelCase` (`householdId`, `calculateNextDueDate()`).
- Types & interfaces: `PascalCase`, no `I` prefix (`DomainEvent`, not `IDomainEvent`).
- Booleans: prefixed `is`/`has`/`should`/`can` (`isRecurring`, `hasExpired`, `shouldNotify`).
- Prefer a string-literal union backed by an `as const` object over TS `enum` for anything that crosses a serialization boundary (JSON payloads, queue messages) — `enum` has runtime/interop quirks that a plain object + union type avoids. See §17.2.
- NestJS DI tokens, custom decorators, and guard names read as what they do, not what they are (`RequireHouseholdRole`, not `RoleCheckDecorator`).

### 17.2 No Magic Strings — Centralized Constants

The rule: no bare string/number literal that's used more than once — event type names, queue names, error codes, route paths, cookie/header names, role names — lives inline. Every one of those groups is a single exported `as const` object in `libs/shared/constants`, imported wherever it's needed. You get compiler-checked, refactor-safe, autocomplete-friendly identifiers instead of typo-prone literals scattered across the repo, and it's a concrete answer when someone asks how you avoid magic strings in production code.

```ts
// libs/shared/constants/src/lib/event-types.constants.ts
export const EVENT_TYPES = {
  BILL_DETECTED: 'BillDetected',
  DOCUMENT_EXPIRING: 'DocumentExpiring',
  MAINTENANCE_DUE: 'MaintenanceDue',
  TASK_EXTRACTED: 'TaskExtracted',
} as const;

export type EventType = (typeof EVENT_TYPES)[keyof typeof EVENT_TYPES];
```

```ts
// libs/shared/constants/src/lib/queue-names.constants.ts
export const QUEUE_NAMES = {
  CONNECTOR_INGEST: 'connector-ingest',
  RULES_EVALUATION: 'rules-evaluation',
  NOTIFICATION_DISPATCH: 'notification-dispatch',
} as const;
```

```ts
// libs/shared/constants/src/lib/routes.constants.ts
export const API_ROUTES = {
  AUTH: {
    LOGIN: '/auth/login',
    GOOGLE: '/auth/google',
    GOOGLE_CALLBACK: '/auth/google/callback',
    REFRESH: '/auth/refresh',
  },
  HOUSEHOLDS: {
    BASE: '/households',
    MEMBERS: (id: string) => `/households/${id}/members`,
  },
} as const;
```

```ts
// libs/shared/constants/src/lib/error-codes.constants.ts
export const ERROR_CODES = {
  INVALID_CREDENTIALS: 'AUTH_INVALID_CREDENTIALS',
  TOKEN_EXPIRED: 'AUTH_TOKEN_EXPIRED',
  REFRESH_TOKEN_REUSE_DETECTED: 'AUTH_REFRESH_REUSE_DETECTED',
  HOUSEHOLD_NOT_FOUND: 'HOUSEHOLD_NOT_FOUND',
} as const;
```

Role names, cookie names, and header names follow the same pattern (`ROLES.OWNER`, `COOKIES.ACCESS_TOKEN`). Everything is re-exported from one entry point:

```ts
// libs/shared/constants/src/index.ts
export * from './lib/event-types.constants';
export * from './lib/queue-names.constants';
export * from './lib/routes.constants';
export * from './lib/error-codes.constants';
export * from './lib/roles.constants';
export * from './lib/cookies.constants';
```

```ts
import { EVENT_TYPES, QUEUE_NAMES, ROLES } from '@cairn/shared-constants';
```

### 17.3 Nx Module Boundaries

Every lib/app is tagged in its `project.json`:

```json
{ "tags": ["scope:worker", "type:feature"] }
```

`depConstraints` in the root ESLint config (`@nx/enforce-module-boundaries`) then define what's allowed to depend on what — e.g. `scope:web` cannot import `scope:worker`; `type:util` (constants, formatting helpers) can be imported by anything; `type:feature` libs cannot import other `type:feature` libs directly, only through `domain`. This turns "clean architecture" from a README claim into a lint rule that fails CI when violated — a concrete, checkable version of what most portfolio projects only assert.

### 17.4 Git Hooks — Husky, lint-staged, commitlint

- **pre-commit** — `lint-staged` runs ESLint `--fix` and Prettier on staged files only (fast, incremental, doesn't touch the whole repo).
- **commit-msg** — `commitlint` enforces Conventional Commits against `commitlint.config.js` (`@commitlint/config-conventional`).
- **pre-push** — `nx affected -t lint,test` — re-checks only what changed relative to `main`.

```json
// package.json
"lint-staged": {
  "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
  "*.{json,md,yml}": ["prettier --write"]
}
```

```js
// commitlint.config.js
module.exports = { extends: ['@commitlint/config-conventional'] };
```

### 17.5 Linting, Formatting & Editor Config

- ESLint with `@typescript-eslint` strict rules + `@nx/enforce-module-boundaries` + `eslint-plugin-import` (`import/order`: external packages → `@cairn/*` internal libs → relative imports, each group alphabetized).
- Prettier as the single formatting authority — stylistic ESLint rules disabled so there's no fighting between the two.
- `.editorconfig` for consistent indentation/line endings/charset across editors.
- `tsconfig.base.json` stricter than default: `"strict": true`, `"noUncheckedIndexedAccess": true`, `"noImplicitOverride": true`, `"exactOptionalPropertyTypes": true` — each one is a small, explainable decision if asked.
- **Branching:** trunk-based, short-lived feature branches (`feat/gmail-connector`), squash-merge to `main`.
- **Code review checklist:** no `any` without justification, error paths handled (not just the happy path), tests added for new logic, ADR added/updated if the change reflects a real decision, no new magic strings outside `libs/shared/constants`.

### 17.6 Environment & Config Validation

`libs/shared/config` validates `process.env` once at boot with `zod` and fails fast with a readable error, instead of a scattered `process.env.X` read crashing three layers deep at runtime:

```ts
// libs/shared/config/src/lib/env.schema.ts
export const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  GOOGLE_OAUTH_CLIENT_ID: z.string(),
  GOOGLE_OAUTH_CLIENT_SECRET: z.string(),
  GOOGLE_OAUTH_CALLBACK_URL: z.string().url(),
});
export type Env = z.infer<typeof envSchema>;
```

### 17.7 Custom Nx Generator — Scaffold a New Connector

A small generator under `tools/generators/connector` means `nx g @cairn/tools:connector gmail` produces a new lib with the `Connector` interface stub, a fixture-based spec file, correct tags, and an auto-registration entry — instead of copy-pasting an existing connector by hand. This is an unusual detail for a portfolio project: it shows you built developer tooling for the repo, not just features on top of it, and it's a natural thing to demo live in an interview.

### 17.8 Further Hardening (pick what fits your time budget)

- **CODEOWNERS** — even solo, shows you understand review routing at scale.
- **Dependabot / Renovate** — automated dependency-update PRs.
- **Secret scanning** — `gitleaks` as a pre-commit hook or CI step.
- **`pnpm audit`** in CI as a non-blocking warning step.
- **Docker hardening** — multi-stage builds, non-root user in the final image, a tight `.dockerignore`.
- **Storybook** for `libs/ui` — isolated component development and visual review if you want the UI story to stand on its own.
- **Changesets** if you ever want versioned, independently releasable internal libs.
- **PR template** with a checklist (tests, types, docs/ADR updated) and **issue templates** (bug/feature).

---

## 18. Running This for ₹0 — Free-Tier Deployment Architecture

Everything below deploys and runs on free tiers with no card charge, verified against each provider's current published terms as of September 2026 (they change — re-check before you commit to one, and cite the docs in your own ADR). The interesting part isn't "which free services did I pick" — it's that the designed architecture in §4–§9 (queue, always-on worker, BullMQ) doesn't map onto free hosting 1:1, and the honest, explainable response is to _right-size the deployment topology to the constraint_ rather than pretend a $0 host behaves like a paid one. That's the actual architecture story for this section.

### 18.1 The constraint, stated plainly

No free tier anywhere offers a guaranteed **always-on background worker process** — the thing `apps/worker` in §4 is designed to be. Vercel Hobby functions are request-triggered and time out around a minute; Render's free plan explicitly excludes background workers (only web services, Postgres, and a Redis-like key-value store are free there); Railway no longer has a real free plan (trial credit only, now expiring); Fly.io's free allowances have shrunk and now require a card on file. So an always-on BullMQ consumer, as designed, isn't free anywhere reputable right now.

The MVP's own scope makes the fix straightforward: the whole pipeline is a **daily digest**. It doesn't need to react within seconds — it needs to run once a day, reliably. So the free deployment replaces "always-on worker polling a queue" with "an HTTP endpoint that runs the pipeline once when called, triggered daily by a free cron job." Same domain logic, different trigger mechanism — which is exactly why §8's connectors and the rules engine were designed as plain functions in `libs/*` rather than tangled into worker/queue plumbing in the first place. The trigger is a swappable detail, not the architecture.

### 18.2 Where each piece runs

| Component                                                                     | Free host                                | Why this one                                                                                                                                                                                                                       | Caveat worth knowing (and explaining in an interview)                                                                                                                                                                                                                                   |
| ----------------------------------------------------------------------------- | ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/web` (Next.js dashboard)                                                | **Vercel** (Hobby)                       | Purpose-built for Next.js; free `*.vercel.app` domain, no card required.                                                                                                                                                           | Serverless function duration caps around 60s — irrelevant for dashboard pages, relevant if you ever call something slow from a Route Handler.                                                                                                                                           |
| Daily trigger                                                                 | **Vercel Cron** (Hobby)                  | 100 cron jobs per project, included free.                                                                                                                                                                                          | Hobby caps cron to **once per day**, fired within a ±59 min window — this isn't a limitation you're working around, it's exactly the MVP's digest cadence. Going more frequent later is a Pro-plan upgrade, not a redesign.                                                             |
| `apps/api` (NestJS — auth, CRUD, the pipeline-run endpoint, WhatsApp webhook) | **Render** (Free Web Service)            | Runs as a real, persistent Node process rather than being force-fit into a serverless function — sidesteps the Prisma-connection-pool-exhaustion problems serverless + Postgres usually causes.                                    | Free web services **spin down after 15 minutes with no inbound traffic** and take ~1 minute to wake on the next request. The daily cron ping doubles as the wake-up call (§18.4). Render's _free Postgres_ also auto-expires after 30 days — don't use it; use Neon instead (next row). |
| Database                                                                      | **Neon** (Free)                          | Genuinely permanent free tier, no card, no expiry — unlike Render's free Postgres.                                                                                                                                                 | 0.5 GB storage, 100 compute-hours/month, autosuspends after 5 min idle and wakes in about a second on the next query. Comfortably enough for a demo household's data.                                                                                                                   |
| Redis (dedupe cache, light job metadata)                                      | **Upstash** (Free)                       | Permanent free tier, no card, serverless-friendly (REST/HTTP-based client, so it works fine from short-lived function calls).                                                                                                      | 500K commands/month, 256 MB storage. Fine for dedupe-key lookups and caching; not sized for a real high-throughput BullMQ consumer — which is consistent with §18.1, since nothing's running one in this topology anyway.                                                               |
| Messaging channel                                                             | **WhatsApp Cloud API** (Meta, test tier) | Creating a Meta app + adding the WhatsApp product auto-provisions a free test WhatsApp Business Account and test phone number that can message **up to 5 verified recipient numbers at no cost** — no card, no per-message charge. | Beyond those 5 recipients, or moving to a real business-verified number, is where Meta's per-conversation pricing starts. Out of scope for a personal/portfolio deployment where you and household members _are_ the 5 recipients.                                                      |
| CI                                                                            | **GitHub Actions**                       | Unlimited minutes on a **public** repository.                                                                                                                                                                                      | Keep the repo public — which you want for a resume project anyway, and it removes any CI-minutes ceiling entirely.                                                                                                                                                                      |

Local development is unaffected by any of this — Docker Compose (§11) still gives you the full designed stack (real Postgres, real Redis, a real always-on worker if you run it) so you can build and demo the "proper" architecture on your own machine, and the free deployment is a documented, deliberate subset of it for the public demo link.

### 18.3 The pipeline-run endpoint

`apps/api` gains one more controller: an internal, secret-protected endpoint that runs the exact same pipeline logic `apps/worker`'s BullMQ processor would call.

```ts
// apps/api/src/pipeline/pipeline.controller.ts
@Controller('internal/pipeline')
export class PipelineController {
  constructor(private readonly pipeline: PipelineService) {}

  @Post('run')
  @UseGuards(CronSecretGuard) // checks a shared secret header, not a user JWT
  async run() {
    return this.pipeline.runOnce(); // same function libs/rules-engine + libs/connectors power in the worker design
  }
}
```

`PipelineService.runOnce()` lives in a shared lib, not duplicated between `apps/worker` and `apps/api` — it iterates the connector registry (§8), normalizes and persists events, runs the rules engine (§9), and dispatches notifications (§18.7), synchronously, in one call. Vercel Cron hits this endpoint once a day with the shared secret in a header; nothing about the pipeline logic itself changes between "queue consumer" and "cron-triggered HTTP call" — only who invokes it.

```json
// apps/web vercel.json (relevant excerpt)
{
  "crons": [{ "path": "/api/cron/trigger-pipeline", "schedule": "0 3 * * *" }]
}
```

### 18.4 Handling Render's spin-down

Since the daily trigger needs Render awake anyway, have the Vercel Cron target fire a lightweight `GET /health` ping a couple of minutes before the real `POST /internal/pipeline/run` call — either as two scheduled crons a few minutes apart, or one Route Handler that pings health, waits briefly, then triggers the run. It's a small operational detail, but it's the kind of thing worth stating explicitly rather than leaving as an unexplained "why does the first request sometimes take a minute" — free-tier cold starts are a known, designed-for behavior here, not a bug.

### 18.5 WhatsApp webhook — verification and signatures

Two things the WhatsApp controller in `apps/api` must do correctly, both security-relevant and both good interview detail:

```ts
// apps/api/src/whatsapp/whatsapp.controller.ts
@Controller('webhooks/whatsapp')
export class WhatsAppWebhookController {
  // 1. Meta's one-time setup handshake
  @Get()
  verify(@Query() query: WhatsAppVerifyQuery) {
    if (query['hub.verify_token'] === this.config.whatsappVerifyToken) {
      return query['hub.challenge'];
    }
    throw new ForbiddenException();
  }

  // 2. Every inbound message/status callback afterward
  @Post()
  async receive(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-hub-signature-256') signature: string,
  ) {
    if (
      !verifyMetaSignature(
        req.rawBody,
        signature,
        this.config.whatsappAppSecret,
      )
    ) {
      throw new ForbiddenException('Invalid webhook signature');
    }
    // ...translate into a domain command via libs/connectors/manual-entry
  }
}
```

Skipping the `X-Hub-Signature-256` check is the single most common WhatsApp-integration mistake — without it, anyone who finds your webhook URL can POST fake messages. Verifying it (HMAC-SHA256 over the raw request body, keyed with `WHATSAPP_APP_SECRET`) is cheap to implement and a legitimate thing to point to when asked how you handle inbound webhook security.

### 18.6 What breaks first if this grows, and the upgrade path

Worth writing down (as its own short note in `docs/adr/0008-deployment-topology.md`) exactly what the free topology can't do, so it reads as a scoping decision rather than a blind spot:

- **Sub-daily reactivity** (e.g., "notify within an hour of a bill email arriving") needs cron more frequent than once/day → Vercel Pro, or move the trigger to a small always-on host running the real `apps/worker` BullMQ consumer — no application code changes, only the trigger.
- **More than 5 WhatsApp recipients / a real business number** → Meta's paid conversation pricing.
- **Heavier per-run work** (OCR on many documents, large mailbox backfills) risking the ~60s function ceiling → move that connector's execution off Vercel/Render onto a host with longer-running jobs, or chunk the work across multiple cron-triggered calls.
- **More than ~0.5 GB of data or sustained load** → Neon's paid tier, same connection string shape, no migration pain.

None of these are failures of the design — they're exactly the kind of "here's what I'd change at 10x scale" answer that makes a portfolio project read as engineered rather than lucky.

### 18.7 Free-deployment checklist

- [ ] Repo public on GitHub (free unlimited Actions minutes).
- [ ] Neon project created, `DATABASE_URL` (pooled connection string) in Render + Vercel env vars.
- [ ] Upstash Redis database created, `REDIS_URL` in Render env vars.
- [ ] Render Free Web Service for `apps/api`, env vars set, health check path configured.
- [ ] Meta App + WhatsApp product added, test number provisioned, up to 5 recipient numbers verified, webhook URL pointed at the Render API's public URL, `WHATSAPP_VERIFY_TOKEN`/`WHATSAPP_APP_SECRET` set on both sides.
- [ ] Google Cloud OAuth consent screen configured (Testing mode is fine — no Google review needed for your own account), `GOOGLE_OAUTH_CLIENT_ID/SECRET` set.
- [ ] Vercel project for `apps/web`, cron entries in `vercel.json` (health-ping + pipeline-run), `CRON_SECRET` matching Render's `CronSecretGuard` value.
- [ ] End-to-end smoke test: trigger the cron manually once (`vercel cron trigger` or hit the endpoint directly), confirm a WhatsApp/email digest arrives.

---

## 19. Using This Guide With an AI Coding Agent

If you're using Claude Code (or similar) to help build this:

1. Keep this file as `ARCHITECTURE.md` at the repo root — point the agent at it as persistent context.
2. Work milestone by milestone (§16), not the whole system at once — give the agent one milestone's scope per session so it doesn't improvise architecture that contradicts this doc.
3. After each milestone, ask the agent to update `docs/roadmap.md` and write/refresh the relevant ADR — keeping the docs live is itself part of the deliverable, not an afterthought.
4. When a decision changes (e.g., swapping Redis for something else later), update the ADR rather than silently drifting — the paper trail is the point.

---

## 20. Suggested Next Steps

- Scaffold the actual Nx workspace + folder structure from §5, with Husky/lint-staged/commitlint/ESLint/Prettier wired up from commit one (§17).
- Write the first two ADRs (`0001-monorepo-tooling.md`, `0004-auth-strategy.md`) — the two decisions you'll be asked about most.
- Create `docs/roadmap.md` and the GitHub Projects board with M0–M2 broken into issues.
- Build M0 (empty scaffold, CI green, hooks enforced) as the first real commit.
- Once M2 is demoable locally, work through the §18 checklist to get a live, $0 deployment URL — a working link beats a screenshot on a resume every time.

Happy to help with any of these next — scaffolding the repo, writing the ADR templates, drafting the `Connector` Nx generator, or turning §16 into actual GitHub issues.
