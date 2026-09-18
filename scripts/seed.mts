/**
 * Loads a household with realistic demo data that exercises every feature: documents (expired,
 * urgent, upcoming), tasks (open/overdue/done), bills, automation rules, connector rows, alert
 * history (sent + one failed), auto-detected events and low-confidence items for the Needs
 * Review queue.
 *
 *   pnpm db:seed --email you@example.com                # local dev database (.env.local wins)
 *   pnpm db:seed --email you@example.com --remote       # the deployed database (.env only)
 *
 * Flags:
 *   --email <addr>     required. Reuses that user's household, creating the user if missing.
 *   --name <name>      display name when the user has to be created.
 *   --password <pw>    password when the user has to be created (otherwise Google/reset-only).
 *   --with-member      also add a second household member (<local>+partner@<domain>).
 *   --reset            FIRST DELETE the household's documents, tasks, bills, events, alerts and
 *                      rules, so the seed is the only data. Never the default. Files attached
 *                      to deleted documents stay in Blob storage.
 *   --dry-run          run everything inside a transaction that is rolled back at the end.
 *   --remote           target the database in .env (e.g. Neon) instead of .env.local's.
 *
 * Re-running is safe: rows are matched by natural key (label, description, vendor, name,
 * dedupeKey) and skipped if present, so nothing is duplicated.
 */
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { parseArgs } from 'node:util';

import dotenv from 'dotenv';

const { values: args } = parseArgs({
  options: {
    email: { type: 'string' },
    name: { type: 'string' },
    password: { type: 'string' },
    'with-member': { type: 'boolean', default: false },
    reset: { type: 'boolean', default: false },
    'dry-run': { type: 'boolean', default: false },
    remote: { type: 'boolean', default: false },
  },
  allowPositionals: true,
});

if (!args.email || !args.email.includes('@')) {
  console.error(
    'Usage: pnpm db:seed --email you@example.com [--remote] [--reset] [--dry-run]',
  );
  process.exit(1);
}
const email = args.email.trim().toLowerCase();

dotenv.config({ path: '.env', quiet: true });
if (!args.remote) {
  dotenv.config({ path: '.env.local', override: true, quiet: true });
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('DATABASE_URL is not set (checked .env and .env.local).');
  process.exit(1);
}
const dbHost = new URL(databaseUrl).hostname;
const isLocal = dbHost === 'localhost' || dbHost === '127.0.0.1';
if (!isLocal && !args.remote) {
  console.error(
    `Refusing to write to remote database "${dbHost}" without --remote. ` +
      'If that is what you want, re-run with --remote.',
  );
  process.exit(1);
}

// The generated client is CommonJS, so take it via default import.
import prismaPkg from '../libs/database/src/generated/client/index.js';
const { PrismaClient } = prismaPkg;

const prisma = new PrismaClient();
const DAY = 24 * 60 * 60 * 1000;
const now = new Date();
const at = (days: number, hours = 0) =>
  new Date(now.getTime() + days * DAY + hours * 60 * 60 * 1000);
const inr = (n: number) => `₹${n.toLocaleString('en-IN')}`;

class DryRunRollback extends Error {}

type Tx = InstanceType<typeof PrismaClient>;

async function run(tx: Tx) {
  const created: Record<string, number> = {};
  const skipped: Record<string, number> = {};
  const tally = (key: string, made: number, total: number) => {
    created[key] = made;
    skipped[key] = total - made;
  };

  // ── User + household ───────────────────────────────────────────────────────
  let user = await tx.user.findUnique({ where: { email } });
  if (!user) {
    let passwordHash: string | null = null;
    if (args.password) {
      const argon2 = createRequire(import.meta.url)('argon2');
      passwordHash = await argon2.hash(args.password, {
        type: argon2.argon2id,
      });
    }
    const local = email.split('@')[0] ?? 'demo';
    user = await tx.user.create({
      data: {
        email,
        name:
          args.name ??
          local
            .replace(/[._-]+/g, ' ')
            .replace(/\b\w/g, (c) => c.toUpperCase()),
        passwordHash,
        emailVerifiedAt: now,
      },
    });
    console.log(
      `Created user ${email}` +
        (passwordHash
          ? ' (password set)'
          : ' (no password: sign in with Google or use "forgot password")'),
    );
  }

  let membership = await tx.householdMember.findFirst({
    where: { userId: user.id },
    orderBy: { joinedAt: 'asc' },
  });
  if (!membership) {
    const household = await tx.household.create({
      data: { name: `${user.name.split(' ')[0]}'s Household` },
    });
    membership = await tx.householdMember.create({
      data: { householdId: household.id, userId: user.id, role: 'OWNER' },
    });
  }
  const householdId = membership.householdId;

  const members: {
    id: string;
    email: string;
    phone: string | null;
    name: string;
  }[] = [user];
  if (args['with-member']) {
    const [local, domain] = email.split('@');
    const partnerEmail = `${local}+partner@${domain}`;
    let partner = await tx.user.findUnique({ where: { email: partnerEmail } });
    partner ??= await tx.user.create({
      data: {
        email: partnerEmail,
        name: 'Alex (demo partner)',
        emailVerifiedAt: now,
      },
    });
    await tx.householdMember.upsert({
      where: { householdId_userId: { householdId, userId: partner.id } },
      update: {},
      create: { householdId, userId: partner.id, role: 'MEMBER' },
    });
    members.push(partner);
  }
  const owner = user;

  // ── Optional wipe ─────────────────────────────────────────────────────────
  if (args.reset) {
    const gone = {
      notifications: (
        await tx.notification.deleteMany({ where: { householdId } })
      ).count,
      events: (await tx.eventLog.deleteMany({ where: { householdId } })).count,
      documents: (await tx.document.deleteMany({ where: { householdId } }))
        .count,
      tasks: (await tx.task.deleteMany({ where: { householdId } })).count,
      bills: (await tx.bill.deleteMany({ where: { householdId } })).count,
      rules: (await tx.rule.deleteMany({ where: { householdId } })).count,
    };
    console.log('Reset: deleted', gone);
  }

  // ── Preferences + connectors (created only if missing) ────────────────────
  await tx.householdConfig.upsert({
    where: { householdId },
    update: {},
    create: { householdId },
  });
  for (const [key, lastRun] of [
    ['MANUAL', at(0, -3)],
    ['OCR', at(-2)],
  ] as const) {
    await tx.connectorConfig.upsert({
      where: { householdId_key: { householdId, key } },
      update: {},
      create: { householdId, key, enabled: true, lastRunAt: lastRun },
    });
  }

  // ── Documents ────────────────────────────────────────────────────────────
  const documents = [
    [
      'Passport - Primary',
      'PASSPORT',
      58,
      'Needs 6+ months validity for international travel',
    ],
    [
      'Health Insurance - Family',
      'INSURANCE',
      5,
      'Policy #HL-204411. Renew through the insurer portal',
    ],
    ['Home Insurance Policy', 'INSURANCE', 12, 'Policy #HI-88231'],
    ['Car Insurance', 'INSURANCE', 26, 'Comprehensive + zero depreciation'],
    [
      'Broadband Contract',
      'OTHER',
      45,
      'Auto-renews. Cancel 30 days before to switch plans',
    ],
    [
      'Apartment Lease Agreement',
      'PROPERTY_LEASE',
      75,
      'Landlord: Mr. Rao. 11-month term',
    ],
    [
      'Refrigerator Warranty',
      'WARRANTY',
      120,
      'Invoice in the kitchen drawer folder',
    ],
    ["Driver's License", 'DRIVERS_LICENSE', 210, null],
    ['Vehicle Registration (RC)', 'VEHICLE_RC', 340, null],
    [
      'Income Tax Return (ITR-V)',
      'TAX_RETURN',
      400,
      'Acknowledgement no. on the e-filing portal',
    ],
    ['Vaccination Records', 'MEDICAL', 365, 'Both kids, up to date'],
    ['National ID', 'NATIONAL_ID', 2900, null],
    [
      'Washing Machine Warranty',
      'WARRANTY',
      -9,
      'Expired. Extended warranty quoted at Rs 2,499',
    ],
  ] as const;
  {
    const have = new Set(
      (
        await tx.document.findMany({
          where: { householdId },
          select: { label: true },
        })
      ).map((d) => d.label),
    );
    const fresh = documents.filter(([label]) => !have.has(label));
    await tx.document.createMany({
      data: fresh.map(([label, type, days, notes]) => ({
        householdId,
        label,
        type,
        expiresOn: at(days),
        notes,
      })),
    });
    tally('documents', fresh.length, documents.length);
  }

  // ── Tasks ────────────────────────────────────────────────────────────────
  const tasks = [
    ['Schedule annual HVAC servicing', 'OPEN', 'HIGH', 6],
    ['Renew car insurance before it lapses', 'IN_PROGRESS', 'URGENT', 20],
    ['Pay society maintenance charges', 'OPEN', 'MEDIUM', -3],
    ['Replace water purifier filter', 'OPEN', 'MEDIUM', -1],
    ['Collect documents for passport renewal', 'IN_PROGRESS', 'HIGH', 21],
    ['Book dentist appointments for the kids', 'OPEN', 'LOW', 14],
    ['Compare broadband plans', 'OPEN', 'LOW', null],
    ['Clean gutters and terrace drain', 'DONE', 'LOW', -10],
    ['Update emergency contacts sheet', 'DONE', 'MEDIUM', -20],
    ['File property tax receipt', 'DONE', 'HIGH', -30],
  ] as const;
  {
    const have = new Set(
      (
        await tx.task.findMany({
          where: { householdId },
          select: { description: true },
        })
      ).map((t) => t.description),
    );
    const fresh = tasks.filter(([description]) => !have.has(description));
    await tx.task.createMany({
      data: fresh.map(([description, status, priority, due], i) => ({
        householdId,
        description,
        status,
        priority,
        dueOn: due === null ? null : at(due),
        assigneeId: (members[i % members.length] ?? owner).id,
      })),
    });
    tally('tasks', fresh.length, tasks.length);
  }

  // ── Bills ────────────────────────────────────────────────────────────────
  const bills = [
    ['Indane Gas Cylinder', 1103, 1, false],
    ['BESCOM Electricity', 2340.5, 3, true],
    ['Airtel Broadband', 1179, 9, true],
    ['HDFC Credit Card', 18450.75, 14, false],
    ['Society Maintenance', 3500, 21, true],
    ['Netflix', 649, 27, true],
    ['Municipal Water Board', 480, -4, false],
  ] as const;
  {
    const have = new Set(
      (
        await tx.bill.findMany({
          where: { householdId },
          select: { vendor: true },
        })
      ).map((b) => b.vendor),
    );
    const fresh = bills.filter(([vendor]) => !have.has(vendor));
    await tx.bill.createMany({
      data: fresh.map(([vendor, amount, days, isRecurring]) => ({
        householdId,
        vendor,
        amount,
        currency: 'INR',
        dueDate: at(days),
        isRecurring,
      })),
    });
    tally('bills', fresh.length, bills.length);
  }

  // ── Automation rules ─────────────────────────────────────────────────────
  const rules = [
    [
      'DOCUMENT_EXPIRING',
      'DocumentExpiring',
      'payload.expiresOn',
      60,
      'a document expires',
      'normal',
      true,
    ],
    [
      'BILL_DETECTED',
      'BillDetected',
      'payload.dueDate',
      7,
      'a bill is due',
      'high',
      true,
    ],
    [
      'MAINTENANCE_DUE',
      'MaintenanceDue',
      'payload.dueOn',
      14,
      'maintenance is due',
      'normal',
      true,
    ],
    [
      'DOCUMENT_EXPIRING',
      'DocumentExpiring',
      'payload.expiresOn',
      90,
      'a document expires',
      'normal',
      false,
    ],
  ] as const;
  {
    const have = new Set(
      (
        await tx.rule.findMany({
          where: { householdId },
          select: { name: true },
        })
      ).map((r) => r.name),
    );
    const fresh = rules
      .map(([column, on, field, lte, phrase, priority, isActive]) => ({
        householdId,
        eventType: column,
        name: `Start alerting ${lte} days before ${phrase}`,
        isActive,
        definition: {
          id: `${on.toLowerCase()}-${lte}d`,
          on,
          when: { daysUntil: { field, lte } },
          then: [{ action: 'notify', channel: 'email', priority }],
        },
      }))
      .filter((rule) => !have.has(rule.name));
    await tx.rule.createMany({ data: fresh });
    tally('rules', fresh.length, rules.length);
  }

  // ── Events + the alerts they produced ─────────────────────────────────────
  const iso = (d: Date) => d.toISOString();
  type Seeded = {
    slug: string;
    source: 'GMAIL' | 'CALENDAR' | 'MANUAL' | 'OCR' | 'WHATSAPP';
    type:
      | 'BILL_DETECTED'
      | 'DOCUMENT_EXPIRING'
      | 'MAINTENANCE_DUE'
      | 'TASK_EXTRACTED';
    ago: number; // days ago it was detected
    payload: Record<string, unknown>;
    state: 'processed' | 'pending' | 'review' | 'failed';
    subject?: string;
    channel?: 'EMAIL' | 'WHATSAPP' | 'DASHBOARD';
  };
  const high = { confidence: 'high' };
  const low = { confidence: 'low' };
  const seeded: Seeded[] = [
    {
      slug: 'gmail-bescom',
      source: 'GMAIL',
      type: 'BILL_DETECTED',
      ago: 2,
      state: 'processed',
      subject: `Bill due: BESCOM Electricity ${inr(2340.5)}`,
      payload: {
        vendor: 'BESCOM Electricity',
        amount: 2340.5,
        currency: 'INR',
        dueDate: iso(at(3)),
        isRecurring: true,
        ...high,
      },
    },
    {
      slug: 'gmail-airtel',
      source: 'GMAIL',
      type: 'BILL_DETECTED',
      ago: 3,
      state: 'processed',
      subject: `Bill due: Airtel Broadband ${inr(1179)}`,
      payload: {
        vendor: 'Airtel Broadband',
        amount: 1179,
        currency: 'INR',
        dueDate: iso(at(9)),
        isRecurring: true,
        ...high,
      },
    },
    {
      slug: 'wa-gas',
      source: 'WHATSAPP',
      type: 'BILL_DETECTED',
      ago: 0.25,
      state: 'processed',
      channel: 'WHATSAPP',
      subject: `Bill due: Indane Gas Cylinder ${inr(1103)}`,
      payload: {
        vendor: 'Indane Gas Cylinder',
        amount: 1103,
        currency: 'INR',
        dueDate: iso(at(1)),
        isRecurring: false,
      },
    },
    {
      slug: 'scan-water-overdue',
      source: 'MANUAL',
      type: 'BILL_DETECTED',
      ago: 1,
      state: 'failed',
      subject: `Overdue: Municipal Water Board ${inr(480)}`,
      payload: {
        vendor: 'Municipal Water Board',
        amount: 480,
        currency: 'INR',
        dueDate: iso(at(-4)),
        isRecurring: false,
        isOverdue: true,
        daysUntilDue: -4,
      },
    },
    {
      slug: 'scan-health-14d',
      source: 'MANUAL',
      type: 'DOCUMENT_EXPIRING',
      ago: 1.5,
      state: 'processed',
      subject: 'Document expiring: Health Insurance - Family (5 days left)',
      payload: {
        documentLabel: 'Health Insurance - Family',
        documentType: 'insurance',
        expiresOn: iso(at(5)),
        daysUntilExpiry: 5,
        reminderThreshold: 14,
      },
    },
    {
      slug: 'scan-washer-expired',
      source: 'MANUAL',
      type: 'DOCUMENT_EXPIRING',
      ago: 1,
      state: 'processed',
      subject: 'Document expired: Washing Machine Warranty',
      payload: {
        documentLabel: 'Washing Machine Warranty',
        documentType: 'warranty',
        expiresOn: iso(at(-9)),
        daysUntilExpiry: 0,
        isExpired: true,
      },
    },
    {
      slug: 'cal-ac-service',
      source: 'CALENDAR',
      type: 'MAINTENANCE_DUE',
      ago: 4,
      state: 'processed',
      subject: 'Maintenance due: Air conditioner - Annual service',
      payload: {
        asset: 'Air conditioner',
        task: 'Annual service',
        dueOn: iso(at(11)),
        ...high,
      },
    },
    {
      slug: 'gmail-school-fee',
      source: 'GMAIL',
      type: 'TASK_EXTRACTED',
      ago: 5,
      state: 'processed',
      channel: 'DASHBOARD',
      subject: 'New task found: Confirm school fee payment',
      payload: {
        description: 'Confirm school fee payment by Friday',
        dueOn: iso(at(4)),
        ...high,
      },
    },
    {
      slug: 'scan-passport-60d',
      source: 'MANUAL',
      type: 'DOCUMENT_EXPIRING',
      ago: 0,
      state: 'pending',
      payload: {
        documentLabel: 'Passport - Primary',
        documentType: 'passport',
        expiresOn: iso(at(58)),
        daysUntilExpiry: 58,
        reminderThreshold: 60,
      },
    },
    {
      slug: 'gmail-amazonpay',
      source: 'GMAIL',
      type: 'BILL_DETECTED',
      ago: 0.5,
      state: 'review',
      payload: {
        vendor: 'Amazon Pay - Statement',
        amount: 4299,
        currency: 'INR',
        dueDate: iso(at(8)),
        isRecurring: false,
        ...low,
      },
    },
    {
      slug: 'ocr-reliance',
      source: 'OCR',
      type: 'BILL_DETECTED',
      ago: 0.2,
      state: 'review',
      payload: {
        vendor: 'Reliance Fresh',
        amount: 1872,
        currency: 'INR',
        dueDate: iso(at(5)),
        isRecurring: false,
        ...low,
      },
    },
    {
      slug: 'cal-tyres',
      source: 'CALENDAR',
      type: 'MAINTENANCE_DUE',
      ago: 0.8,
      state: 'review',
      payload: {
        asset: 'Car',
        task: 'Tyre rotation',
        dueOn: iso(at(18)),
        ...low,
      },
    },
  ];

  const keyFor = (slug: string) => `SEED:${householdId}:${slug}`;
  const haveKeys = new Set(
    (
      await tx.eventLog.findMany({
        where: { dedupeKey: { in: seeded.map((e) => keyFor(e.slug)) } },
        select: { dedupeKey: true },
      })
    ).map((e) => e.dedupeKey),
  );
  const freshEvents = seeded.filter((e) => !haveKeys.has(keyFor(e.slug)));
  const eventIds = new Map(freshEvents.map((e) => [e.slug, randomUUID()]));

  await tx.eventLog.createMany({
    data: freshEvents.map((e) => {
      const occurredAt = at(-e.ago);
      return {
        id: eventIds.get(e.slug) as string,
        householdId,
        type: e.type,
        source: e.source,
        payload: e.payload,
        dedupeKey: keyFor(e.slug),
        occurredAt,
        needsReview: e.state === 'review',
        processedAt:
          e.state === 'processed' || e.state === 'failed'
            ? new Date(occurredAt.getTime() + 4 * 60 * 1000)
            : null,
      };
    }),
  });
  tally('events', freshEvents.length, seeded.length);

  const alerts: Record<string, unknown>[] = [];
  for (const e of freshEvents) {
    if ((e.state !== 'processed' && e.state !== 'failed') || !e.subject)
      continue;
    const sentAt = new Date(at(-e.ago).getTime() + 5 * 60 * 1000);
    const recipients =
      e.channel === 'WHATSAPP' ? members.filter((m) => m.phone) : members;
    for (const member of recipients) {
      const channel = e.channel ?? 'EMAIL';
      const failed = e.state === 'failed' && member !== owner;
      alerts.push({
        householdId,
        eventId: eventIds.get(e.slug),
        channel,
        status: failed ? 'FAILED' : 'SENT',
        payload: {
          to: channel === 'WHATSAPP' ? member.phone : member.email,
          subject: e.subject,
          body: e.subject,
        },
        sentAt: failed ? null : sentAt,
        failReason: failed ? 'SMTP 550: mailbox unavailable' : null,
        createdAt: sentAt,
      });
    }
    // Guarantee the demo shows one failed alert even with a single member.
    if (e.state === 'failed' && members.length === 1) {
      alerts.push({
        householdId,
        eventId: eventIds.get(e.slug),
        channel: 'WHATSAPP',
        status: 'FAILED',
        payload: {
          to: owner.phone ?? 'not linked',
          subject: e.subject,
          body: e.subject,
        },
        sentAt: null,
        failReason: 'WhatsApp number not linked for this member',
        createdAt: sentAt,
      });
    }
  }
  await tx.notification.createMany({ data: alerts as never });
  created['alerts'] = alerts.length;

  return { created, skipped, householdId, members: members.length };
}

function report(result: Awaited<ReturnType<typeof run>>) {
  console.log(
    `\nHousehold ${result.householdId} (${result.members} member${result.members === 1 ? '' : 's'}) for ${email}`,
  );
  for (const [key, made] of Object.entries(result.created)) {
    const skip = result.skipped[key] ?? 0;
    console.log(
      `  ${key.padEnd(10)} +${made}${skip ? `  (${skip} already there)` : ''}`,
    );
  }
}

console.log(
  `Target database: ${dbHost}${isLocal ? ' (local)' : ' (REMOTE)'}${args['dry-run'] ? '  [dry run: will roll back]' : ''}`,
);
if (args.reset) {
  console.log(
    '--reset: existing documents, tasks, bills, events, alerts and rules for this household will be deleted first.',
  );
}

if (args['dry-run']) {
  // Run for real inside a transaction, then throw so Postgres discards every write.
  prisma
    .$transaction(
      async (tx) => {
        const result = await run(tx as Tx);
        report(result);
        throw new DryRunRollback();
      },
      { timeout: 120_000, maxWait: 20_000 },
    )
    .then(
      () => undefined,
      (error) => {
        if (error instanceof DryRunRollback) {
          console.log(
            `\nDry run complete: all writes rolled back (target: ${dbHost}).`,
          );
          return;
        }
        throw error;
      },
    )
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
} else {
  prisma
    .$transaction(async (tx) => report(await run(tx as Tx)), {
      timeout: 120_000,
      maxWait: 20_000,
    })
    .then(() => console.log('\nDone. Sign in and open the dashboard.'))
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
