# Cairn — Database Engineering Guide

Companion to `ENGINEERING_KICKSTART.md` §3 (the module-wise schema itself) and `ARCHITECTURE.md` §18 (free-tier Neon deployment). This doc covers how the database is actually operated day to day: connections, migrations, seeding, transactions, and the decisions worth being able to explain.

---

## 1. Connection Strings — Pooled vs. Direct

Neon (and most managed Postgres with a connection pooler in front) needs **two** connection strings, not one, and Prisma has a field for exactly this:

```prisma
// prisma/schema/schema.prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")        // pooled (PgBouncer) — used by the running app
  directUrl = env("DIRECT_DATABASE_URL") // unpooled — used only by `prisma migrate`
}
```

- **`DATABASE_URL`** (pooled) is what `apps/api` connects with at runtime — pooling matters because Render's free web service, once awake, holds a normal connection pool for its lifetime, and pooling protects Neon from connection exhaustion if you ever do run something serverless against it later.
- **`DIRECT_DATABASE_URL`** (unpooled) is what `prisma migrate dev`/`deploy` uses — schema migrations need a direct session, not one routed through a transaction pooler.

Locally (Docker Postgres, §11 of `ARCHITECTURE.md`), both env vars just point at the same local instance — there's no pooler in the loop, so the distinction is free tier only, but keeping both vars from day one means switching between local and Neon is a config change, not a schema change.

---

## 2. Migration Workflow

- **Local development:** `pnpm nx run database:migrate` (wraps `prisma migrate dev --name <change>`) — generates a new migration file, applies it, regenerates the client. Never hand-edit a generated migration's SQL after it's been applied anywhere but your own machine.
- **CI/CD:** `prisma migrate deploy` runs against the target database (Neon) as a step before the API deploy, never `migrate dev` — `deploy` only applies pending migrations, it never generates new ones or prompts.
- **Naming:** migration names describe the change, not the ticket number — `add_bill_currency_default`, not `fix-123`.
- **Data migrations** (backfilling a new required column, for example) are separate, explicit scripts run once, not squeezed into a schema migration's SQL — keep the two concerns apart so a schema rollback never accidentally re-runs a data mutation.

---

## 3. Seeding

`prisma/seed.ts`, wired via `"prisma": { "seed": "tsx prisma/seed.ts" }` in `package.json`, run with `pnpm nx run database:seed`. Two uses:

- **Local dev** — a demo household, a couple of users, a handful of documents/bills/tasks with realistic due dates (some overdue, some due-soon, some healthy) so the dashboard's semantic color states (Kickstart §4.6) are all visible immediately without manually creating data.
- **The live free-tier demo** — the same seed, run once against Neon after the first deploy, so the public link isn't an empty dashboard. Re-seeding is idempotent (`upsert`, not `create`) so running it again doesn't duplicate rows.

---

## 4. Data Access Pattern

`PrismaService` (from `libs/database`) is injected only into feature _services_ (`BACKEND_ENGINEERING.md` §1) — there's no separate repository layer, because Prisma's generated client already is the data-access abstraction; adding another layer on top of it would just be indirection without a second implementation ever living behind it. If a genuine second data source shows up later (a cache-aside read path, say), that's when a repository interface earns its place — not before.

---

## 5. Transactions

Anything that writes across more than one model as a single logical action goes through `prisma.$transaction`, not sequential awaited calls — signup is the clearest example (`ARCHITECTURE.md`/`BACKEND_ENGINEERING.md` §4): creating the `User`, the default `Household`, and the `OWNER` `HouseholdMember` row must all succeed or all roll back together, or you can end up with a user that has no household.

```ts
const [user, household] = await this.prisma.$transaction(async (tx) => {
  const user = await tx.user.create({ data: { email, passwordHash } });
  const household = await tx.household.create({
    data: { name: `${name}'s Household` },
  });
  await tx.householdMember.create({
    data: { userId: user.id, householdId: household.id, role: 'OWNER' },
  });
  return [user, household];
});
```

The pipeline's event-write step (`EventLog` insert with a unique `dedupeKey`) doesn't need a transaction wrapper by itself — the unique constraint is the guarantee (§6 below) — but if a single connector run ever needs to write the event _and_ update `ConnectorConfig.lastRunAt` atomically, wrap both in one `$transaction`.

---

## 6. Idempotency Lives at the Database Layer, Not Just the App Layer

`EventLog.dedupeKey` has a `@unique` constraint (`ENGINEERING_KICKSTART.md` §3) — this is the real guarantee behind §8's idempotency claim in `ARCHITECTURE.md`, not just an application-level `if (exists)` check that could race under concurrent runs. The pipeline's write path should catch the unique-constraint violation (Prisma's `P2002` error code) and treat it as "already processed, skip" rather than letting it bubble up as an unhandled error — belt (app-level check before doing expensive work) and suspenders (DB constraint as the actual guarantee).

---

## 7. Indexing Discipline

Every model that's queried by `householdId` plus a second filter has a composite index for that exact pair (already in the Kickstart schema: `Document(householdId, expiresOn)`, `Bill(householdId, dueDate)`, `EventLog(householdId, type)`). The rule going forward: **before adding a new query pattern, check whether it needs a new index** — don't wait for it to show up slow in production. `EXPLAIN ANALYZE` any query that scans more than a demo dataset's worth of rows once real usage patterns exist.

---

## 8. Soft Delete — a Deliberate "No"

Every model uses hard delete via `onDelete: Cascade` (deleting a `Household` cascades to everything under it). This is a stated decision, not an oversight: a personal household-ops app has no regulatory retention requirement and no multi-party audit need, so soft-delete's complexity (filtering `deletedAt IS NULL` everywhere, forever) isn't worth paying for at this scope. Worth a line in `docs/adr/` if you want the paper trail — and worth knowing where you'd add it back (an `EventLog`-style append-only table is already the audit trail for domain events; soft-delete would only matter for household/document/bill records if the product grew a compliance requirement).

---

## 9. Backups — the Free-Tier Story

Render's free Postgres isn't used at all (§18.2 of `ARCHITECTURE.md` — it expires after 30 days). Neon's free tier doesn't advertise traditional scheduled backups, but Neon's **branching** feature gives you an equivalent for free: creating a branch is an instant, cheap copy-on-write snapshot of the database at that moment. Before a risky migration, branch first, migrate the branch, verify, then apply to the primary — a real backup/rollback story that costs nothing.

---

## 10. Testing

Tests never point at Neon. `Testcontainers` spins a throwaway, real Postgres in a Docker container per test run (or per suite, depending on speed needs), migrations applied fresh each time — this is what makes integration tests trustworthy (real Postgres behavior — constraints, cascades, JSON columns — not an in-memory approximation) without touching shared state or costing anything against the live free-tier database.
