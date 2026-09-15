# Cairn — Worker & Pipeline Engineering Guide

Companion to `ARCHITECTURE.md` §4/§8/§9 (pipeline design) and §18.1/§18.3 (why the free deployment triggers it differently than the local design). This doc covers the actual implementation: the shared pipeline logic, the two trigger shells around it, and how retries/idempotency/dead-letters work in practice.

---

## 1. One Pipeline, Two Trigger Shells

The core principle, stated once so it doesn't need repeating in every section below: **`PipelineService.runOnce()` is a plain, infrastructure-agnostic async function.** It doesn't know or care whether it was called by a BullMQ processor or an HTTP controller. Two thin shells call it:

- **`apps/worker`** (local dev, or a paid always-on host later) — a BullMQ `Processor` consuming a repeatable job.
- **`apps/api`'s `PipelineModule`** (the free-tier deployment) — an HTTP endpoint Vercel Cron hits once a day.

```ts
// libs/rules-engine/src/lib/pipeline.service.ts (conceptually — lives wherever it's shared from)
@Injectable()
export class PipelineService {
  constructor(
    private readonly connectors: ConnectorRegistryService,
    private readonly rules: RulesEngineService,
    private readonly notifications: NotificationDispatchService,
    private readonly events: EventsService,
  ) {}

  async runOnce(householdId?: string): Promise<PipelineRunSummary> {
    const households = householdId
      ? [householdId]
      : await this.events.listActiveHouseholdIds();
    const summary: PipelineRunSummary = { processed: 0, skipped: 0, failed: 0 };

    for (const id of households) {
      for (const connector of this.connectors.getEnabledFor(id)) {
        const rawSignals = await connector.fetch({ householdId: id });
        for (const raw of rawSignals) {
          const event = connector.normalize(raw);
          const wasNew = await this.events.persistIfNew(event); // §6 of DATABASE_ENGINEERING.md — unique dedupeKey
          if (!wasNew) {
            summary.skipped++;
            continue;
          }
          const actions = await this.rules.evaluate(event);
          await this.notifications.dispatch(actions, event);
          summary.processed++;
        }
      }
    }
    return summary;
  }
}
```

Nothing in this function imports `bullmq` or `@nestjs/common`'s HTTP decorators — that's the test of whether the "trigger-agnostic" claim is real.

---

## 2. BullMQ Shell (`apps/worker`)

```ts
// apps/worker/src/pipeline.processor.ts
@Processor(QUEUE_NAMES.RULES_EVALUATION)
export class PipelineProcessor extends WorkerHost {
  constructor(private readonly pipeline: PipelineService) {
    super();
  }

  async process(job: Job): Promise<PipelineRunSummary> {
    return this.pipeline.runOnce(job.data.householdId);
  }
}
```

```ts
// apps/worker/src/pipeline.scheduler.ts — repeatable job registration, local/paid deployment only
await pipelineQueue.add(
  'daily-run',
  {},
  { repeat: { pattern: '0 3 * * *' }, jobId: 'daily-pipeline-run' }, // one canonical repeatable job, not re-added on every boot
);
```

Registering the repeatable job with a fixed `jobId` matters — without it, every service restart would add a duplicate repeatable schedule. Check for the existing repeatable job before adding it on boot.

---

## 3. HTTP Shell (`apps/api`'s `PipelineModule`)

Already shown in full in `ARCHITECTURE.md` §18.3 — the `POST /internal/pipeline/run` controller calls `this.pipeline.runOnce()` directly, synchronously, and returns the summary in the response body (useful for confirming the cron actually did something when you check Vercel's cron logs).

---

## 4. Retry & Backoff

Configured per job in the BullMQ shell — this is the behavior the free-tier HTTP shell _doesn't_ get for free, worth being explicit about:

```ts
await pipelineQueue.add(
  'daily-run',
  {},
  {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 }, // 5s, 10s, 20s
    removeOnComplete: { age: 86400 },
    removeOnFail: false, // keep failed jobs around for the dead-letter view, §5
  },
);
```

In the free-tier HTTP shell, a failed run simply returns a 5xx to Vercel Cron, which doesn't retry on its own — so `PipelineController` should catch per-connector failures internally (one connector failing shouldn't fail the whole run) and let only a total, unexpected failure surface as a 5xx. This is a real, explainable gap between the two shells worth noting in `docs/adr/0008-deployment-topology.md`: retry sophistication is a paid-tier upgrade, and the free-tier default is graceful partial failure instead.

```ts
async runOnce(householdId?: string) {
  // ...
  for (const connector of enabledConnectors) {
    try {
      await this.runConnector(connector);
    } catch (err) {
      this.logger.error({ connector: connector.key, err }, 'connector run failed');
      summary.failed++;
      continue; // one bad connector doesn't take down the household's whole digest
    }
  }
}
```

---

## 5. Dead-Letter Handling

BullMQ moves a job to the failed set once it exhausts its `attempts`. Rather than letting failed jobs sit invisibly, a small `GET /internal/pipeline/dead-letters` endpoint (admin-only) lists them via `queue.getFailed()`, surfaced on the dashboard as "needs attention" per `ARCHITECTURE.md` §12 — even a plain table is enough; the point is that a failure is visible somewhere a human will see it, not silently dropped.

---

## 6. Idempotency in Practice

The dedupe guarantee is enforced at the database layer (`DATABASE_ENGINEERING.md` §6), but the worker's job is to construct a _good_ `dedupeKey` per event before it ever reaches that check:

```ts
// libs/shared/utils/src/lib/hash-dedupe-key.ts
export function hashDedupeKey(parts: (string | number)[]): string {
  return createHash('sha256').update(parts.join('::')).digest('hex');
}

// usage in a connector's normalize():
dedupeKey: hashDedupeKey([
  connector.key,
  householdId,
  externalMessageId,
  dueDate,
]);
```

The inputs matter: too narrow (just `externalMessageId`) and a legitimately-changed bill (amount corrected in a follow-up email) never re-fires; too broad (includes something that changes every fetch, like a fetch timestamp) and dedup never catches a real duplicate. Pick fields that identify "the same real-world fact," not "the same API response."

---

## 7. Running Locally

```bash
pnpm nx run worker:serve   # requires Redis from docker-compose (ARCHITECTURE.md §11)
```

The worker logs every job's correlation ID (propagated from the originating event, `ARCHITECTURE.md` §12) so a `runOnce()` call's full trace — which connectors ran, which events were new vs. skipped, which notifications dispatched — is greppable from one ID.

---

## 8. Testing

- **Unit** — `PipelineService.runOnce()` with `connectors`/`rules`/`notifications` mocked; assert it skips already-seen `dedupeKey`s, continues past a failing connector, and calls the notification dispatcher with the rules engine's actual output.
- **Integration** — one fixture-backed fake connector (not a real Gmail call) feeding a canned raw payload through the real rules engine and a fake (in-memory) notification channel, asserting the end state in a Testcontainers Postgres — this is the test that stands in for the "seed a fake email → digest appears" e2e smoke test at a faster, more isolated layer.
