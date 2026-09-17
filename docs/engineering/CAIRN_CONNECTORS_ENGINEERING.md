# Cairn — Connectors Engineering Guide (`libs/connectors/*`)

Companion to `ARCHITECTURE.md` §8 (the `Connector` contract and why it's shaped that way) and §17.7 (the Nx generator). This doc is the one to open when adding or modifying a data source.

---

## 1. The Contract, in Full

```ts
// libs/domain/src/lib/connector.ts
export interface Connector {
  key: ConnectorKey; // 'GMAIL' | 'CALENDAR' | 'MANUAL' | 'OCR' | 'WHATSAPP'
  schedule: 'cron' | 'webhook';
  fetch(context: ConnectorContext): Promise<RawSignal[]>;
  normalize(raw: RawSignal): DomainEvent;
}

interface ConnectorContext {
  householdId: string;
  config: ConnectorConfig; // from the DB — enabled flag, stored credentials, lastRunAt
}
```

Two methods, two responsibilities, never blurred: **`fetch`** talks to the outside world and returns raw, unshaped data (whatever the source naturally gives you). **`normalize`** is pure — no I/O, no side effects — and turns one raw signal into exactly one `DomainEvent` (`ARCHITECTURE.md` §6). Keeping `normalize` pure is what makes it trivially unit-testable with fixtures (§6 below) without mocking an API client.

---

## 2. Adding a New Connector — Step by Step

1. `nx g @cairn/tools:connector <name>` (`ARCHITECTURE.md` §17.7) — scaffolds `libs/connectors/<name>` with the interface stub, a fixture-based spec file, correct Nx tags, and a registration entry.
2. Implement `fetch()` — call the source's API/SDK, handle auth (stored per-household in `ConnectorConfig.credentials`, §2.3 of `ENGINEERING_KICKSTART.md`), return an array of whatever the source's native shape is.
3. Implement `normalize()` — map one raw item to one `DomainEvent`, construct its `dedupeKey` (`WORKER_ENGINEERING.md` §6), and _do not_ silently drop ambiguous input — see §5 (confidence handling) below.
4. Add a fixture file (`__fixtures__/sample-response.json`) and a contract spec asserting `normalize(fixture)` matches the expected `DomainEvent` shape exactly.
5. Register in `ConnectorRegistryService` (auto-done by the generator) so the pipeline picks it up without touching worker/API internals — the whole point of the plugin architecture (`ARCHITECTURE.md` §8).

---

## 3. Gmail Connector

- **Scopes:** `gmail.readonly` only — never request write/send scopes for a connector that just reads bills.
- **Query strategy:** Gmail's search query syntax (`from:`, `subject:`, `label:`), scoped to a household-configured label (e.g., a filter the user sets up once to label bill-like emails) rather than scanning the entire inbox — narrower scope, faster fetch, and a much easier privacy story to explain ("Cairn only ever reads emails you've explicitly labelled").
- **Parsing:** heuristic/regex extraction of vendor, amount, currency, due date from the email body/subject — inherently fuzzy. Attach a confidence score to the normalized event's payload; low-confidence extractions still get created (never silently dropped) but routed to a manual-review state rather than auto-trusted by the rules engine (§5).
- **Rate limits:** Gmail API is quota-unit based, not simple request counts — batch `messages.list` + `messages.get` calls where possible, and respect `Retry-After` on a 429 with the same exponential backoff pattern as `WORKER_ENGINEERING.md` §4.

---

## 4. Calendar Connector

- Google Calendar API, using a **sync token** for incremental fetches after the first full sync — `fetch()` should request only what changed since the connector's `lastRunAt`, not the whole calendar every run.
- Maps upcoming events matching a household-configured keyword pattern (e.g., "service", "renewal", "MOT") to `MaintenanceDue`-shaped domain events — this connector is the fuzziest by design (calendar events are free text), so lean on the same confidence-scoring approach as Gmail rather than trying to make matching perfect.

---

## 5. Manual-Entry Connector

Two inbound paths feed the same connector, both ending at the same `normalize()`:

- **Dashboard form** — already structured input (`apps/web`'s `DocumentForm`/`BillForm`), so `normalize()` here is closer to a straight mapping than parsing.
- **WhatsApp message** — a small command grammar (`bill Electricity 1200 15-Oct`, `doc passport 2027-03-01`) parsed by `libs/notifications`' WhatsApp inbound handler, then handed to this connector's `normalize()` as if it were any other raw signal. This is what keeps the WhatsApp webhook controller (`ARCHITECTURE.md` §18.5) thin — it doesn't know about bills or documents, it just extracts a command and calls the connector. For a full step-by-step setup guide covering free Meta test numbers, webhooks, tunnels, and production provisioning, see [WHATSAPP_INTEGRATION_GUIDE.md](file:///Users/selvaganapthi/SelvaGanapathi/prj/cairn/docs/engineering/WHATSAPP_INTEGRATION_GUIDE.md).

**Confidence handling, stated once for both Gmail/Calendar and manual entry:** every `DomainEvent`'s payload can carry an optional `confidence: 'high' | 'low'`. The rules engine (`WORKER_ENGINEERING.md` §1) treats `low` confidence events as candidates for a review queue notification ("Does this look right?") rather than an authoritative digest entry — a real product decision that shows up in the schema (`ENGINEERING_KICKSTART.md` §3's `EventLog.payload` is `Json` specifically so this kind of field can evolve without a migration) and is worth its own line in an ADR if you implement it.

---

## 6. OCR Connector (Stretch)

- Input: a receipt/document photo uploaded via the dashboard.
- Pipeline: image → OCR (Tesseract.js for a fully free/local option, or a cloud OCR API's free tier if accuracy matters more than self-hosting) → the same heuristic extraction + confidence scoring as Gmail.
- This connector is the one most likely to exceed Vercel's free function duration (`ARCHITECTURE.md` §18.6) if OCR runs synchronously in the pipeline-run endpoint — a good candidate to keep as a dashboard-triggered, on-demand call (user uploads, waits for one result) rather than something the daily batch pipeline runs automatically, sidestepping the duration ceiling entirely rather than fighting it.

---

## 7. Testing Connectors

Every connector's `normalize()` is tested with fixture-based contract tests — feed a canned, realistic raw payload (a saved sample Gmail message JSON, a sample calendar event, a sample WhatsApp command string), assert the resulting `DomainEvent` matches exactly, including the `dedupeKey`. This is the "Contract" row in `ARCHITECTURE.md` §13's testing table, and it's what lets you refactor a connector's parsing logic with confidence without ever calling the real external API in a test run.

```ts
// libs/connectors/gmail/src/lib/gmail.connector.spec.ts
import sampleBillEmail from './__fixtures__/bill-email.json';

it('normalizes a labelled bill email into a BillDetected event', () => {
  const event = gmailConnector.normalize(sampleBillEmail);
  expect(event.type).toBe(EVENT_TYPES.BILL_DETECTED);
  expect(event.payload.vendor).toBe('Acme Electricity');
  expect(event.dedupeKey).toBe(
    hashDedupeKey([
      'GMAIL',
      sampleBillEmail.householdId,
      sampleBillEmail.id,
      event.payload.dueDate,
    ]),
  );
});
```

`fetch()` itself is not unit tested against the real API — it's covered by the free-tier deployment's own smoke test (`ARCHITECTURE.md` §18.7's checklist) and, if you want a mocked-network layer test, `nock`/`msw` against a recorded fixture response.

---

## 8. Error Handling & Backoff, Per Connector

Every connector's `fetch()` respects its source's own rate-limit signal (Gmail's quota errors, Google Calendar's 403/429s) with exponential backoff — the same pattern as the pipeline-level retry in `WORKER_ENGINEERING.md` §4, just scoped to one HTTP call instead of one job. A connector that fails repeatedly (e.g., a revoked OAuth token) should mark its own `ConnectorConfig.enabled = false` after N consecutive failures rather than erroring silently forever — a small circuit-breaker behavior worth implementing once you have more than one connector running unattended in the daily pipeline.
