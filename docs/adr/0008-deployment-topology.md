# 0008. Deployment topology: Vercel + Render + Neon + Upstash, $0

Date: 2026-09-15

## Status

Accepted (application-side implementation complete; actual account provisioning is a manual step -- see §18.7 checklist, not automatable from this repo).

## Context

No free tier anywhere offers a guaranteed always-on background worker process -- the thing `apps/worker` is designed to be. The MVP's own scope makes the fix straightforward: the whole pipeline is a daily digest, not a real-time system, so the free deployment replaces "always-on worker polling a queue" with "an HTTP endpoint that runs the pipeline once when called, triggered daily by a free cron job." Full reasoning in `ARCHITECTURE.md` §18.1.

## Decision

- `apps/web` → **Vercel** (Hobby). `next.config.js` sets `output: 'standalone'` so `infra/docker/Dockerfile.web` can also run it outside Vercel if needed.
- Daily trigger → **Vercel Cron**, calling `GET /api/cron/trigger-pipeline` (a Next.js route handler in `apps/web`), which pings the API's `/health` to wake a sleeping Render instance, waits briefly, then calls `POST /internal/pipeline/run` on the real API with the shared `CRON_SECRET` header. `vercel.json` schedules it at `0 3 * * *`.
- `apps/api` → **Render** (Free Web Service) — a real persistent Node process, sidestepping the Prisma-connection-pool-exhaustion problems serverless + Postgres usually causes.
- Database → **Neon** (Free), not Render's free Postgres (expires after 30 days).
- Redis → **Upstash** (Free).
- WhatsApp → Meta's WhatsApp Cloud API test tier (up to 5 verified recipients, no card).
- CI → GitHub Actions, unlimited minutes on a public repo.

## What's implemented vs. what's a manual step

Implemented and verified in this repo:

- `Dockerfile.{api,worker,bot}` build the app with `pnpm install` in a build stage, then copy `node_modules` + the build output straight into the runtime stage -- the webpack config for these apps has `generatePackageJson: false`, so there's no prod `package.json` for a separate `pnpm install --prod` to act on in the runtime stage; copying `node_modules` through is the correct fix, and the api image's runtime layout (dist + node_modules, `node main.js`) was verified to boot and pass its own health check.
- `Dockerfile.web` copies `.next/standalone`, `.next/static`, and `public/` into the runtime image; the standalone server's actual entrypoint is nested at `apps/web/server.js` (Next detects the monorepo root and mirrors the app's path under `.next/standalone/`) -- verified by assembling that exact layout locally and confirming the server boots and serves `/login`.
- All four `Dockerfile.*` set `ENV HUSKY=0` before `pnpm install`, since husky's `prepare` script would otherwise fail in a build context with no `.git` directory.
- The cron route (`apps/web/src/app/api/cron/trigger-pipeline/route.ts`) was smoke-tested end to end locally: it pings health, calls the real pipeline endpoint with the shared secret, and returns the run summary.

**Not done, and not something this repo can do on its own:** creating the actual Vercel/Render/Neon/Upstash/Meta accounts, linking this repo to them, and setting their environment variables. That requires the project owner's own accounts and credentials -- see the checklist in `ARCHITECTURE.md` §18.7. Once those accounts exist and the env vars below are set, deployment is just pushing to `main`.

## Env vars each platform needs

- **Vercel** (`apps/web`): `API_BASE_URL`, `NEXT_PUBLIC_API_BASE_URL` (the Render API's public URL), `CRON_SECRET` (must match Render's), optionally `VERCEL_CRON_SECRET`.
- **Render** (`apps/api`): everything in the root `.env.example`, with `DATABASE_URL`/`DIRECT_DATABASE_URL` pointing at Neon, `REDIS_URL` at Upstash, and `WEB_APP_ORIGIN` set to the deployed Vercel URL (so `enableCors` in `main.ts` allows it).

## Consequences

- Sub-daily reactivity, more than 5 WhatsApp recipients, or heavier per-run work than Vercel/Render's function ceilings allow are explicit non-goals of this topology -- see `ARCHITECTURE.md` §18.6 for the upgrade path on each.
- The local Docker Compose stack (§11) still runs the "proper" always-on design (`apps/worker` consuming BullMQ) for development; the free deployment is a deliberate, documented subset of it for the public demo link, not a redesign.
