# Cairn — Engineering Kickstart Guide

**Module map, module-wise Prisma schema, and the full design system/Tailwind theme — the doc you open on day one to start writing code against, alongside `ARCHITECTURE.md`.**

---

## 1. How This Fits With the Architecture Guide

`ARCHITECTURE.md` (the other doc) answers *why* — event-driven design, monorepo shape, auth strategy, free-tier deployment. This doc answers *what exactly do I create* — the concrete module list, the schema file for each one, and the color/token values so `apps/web` doesn't start life as an unstyled shadcn default. Build in this order: read §5–§10 of `ARCHITECTURE.md` once, then use this doc section by section as you scaffold.

---

## 2. Module Map

### 2.1 `apps/api` — NestJS feature modules

Each row is a real `XModule` with its own controller/service/DTOs, imported into `AppModule`. This is the module list to scaffold first (M1–M4 in the roadmap).

| Module | Responsibility | Owns (Prisma models) | Depends on (libs) |
|---|---|---|---|
| `AuthModule` | Signup/login, argon2id hashing, Google OAuth callback, JWT issue/verify, refresh rotation | `User`, `RefreshToken` | `libs/auth`, `libs/database`, `libs/shared/constants` |
| `HouseholdModule` | Household CRUD, invite links, member role management | `Household`, `HouseholdMember` | `libs/database`, `libs/auth` (guards) |
| `UsersModule` | Current-user profile, preferences | `User` | `libs/database` |
| `ConnectorsModule` | Per-household connector enable/disable, credential storage, last-run status | `ConnectorConfig` | `libs/database`, `libs/connectors/*` |
| `EventsModule` | Read access to the event log (activity timeline), idempotency check on write | `EventLog` | `libs/database`, `libs/domain` |
| `RulesModule` | CRUD for household-configurable rules (v2); v1 rules are hardcoded and don't need this module active yet | `Rule` | `libs/database`, `libs/rules-engine` |
| `DocumentsModule` | Document expiry tracking CRUD | `Document` | `libs/database` |
| `BillsModule` | Bill/subscription CRUD | `Bill` | `libs/database` |
| `TasksModule` | Task CRUD, assignment | `Task`, `User` | `libs/database` |
| `NotificationsModule` | Notification history, per-household channel preferences | `Notification` | `libs/database`, `libs/notifications` |
| `WhatsAppModule` | Meta webhook verify (`GET`) + receive (`POST`) with signature check, outbound send wrapper | — (writes via `EventsModule`/`NotificationsModule`) | `libs/notifications`, `libs/connectors/manual-entry` |
| `PipelineModule` | The `POST /internal/pipeline/run` endpoint the free-tier cron hits (§18 of the architecture guide) | — (orchestrates the others) | `libs/connectors/*`, `libs/rules-engine`, `libs/notifications` |
| `HealthModule` | `GET /health` — DB/Redis connectivity, used as the Render pre-warm target | — | `libs/database` |

Build order matches the roadmap: `AuthModule` + `HouseholdModule` first (M1), then `EventsModule` + one connector + `RulesModule` (v1 hardcoded) + `NotificationsModule` email channel (M2 — this alone is a demoable product), then `WhatsAppModule`, `DocumentsModule`, `ConnectorsModule` UI (M3), then `TasksModule` and multi-member polish (M4).

### 2.2 `apps/worker` (local/paid-tier always-on deployment)

Doesn't introduce new modules — it imports the same providers `PipelineModule` orchestrates (`ConnectorRegistryService`, `RulesEngineService`, `NotificationDispatchService` from the relevant libs) and wraps them in a BullMQ `Processor` instead of an HTTP controller. This is the "trigger-agnostic pipeline" principle from §18.1 of the architecture guide made concrete: the business logic is identical; only `PipelineModule`'s HTTP controller vs. `apps/worker`'s queue processor differs.

### 2.3 `libs/*` — what lives where

| Lib | Contains |
|---|---|
| `libs/domain` | Event/entity TypeScript types, zod schemas, the `Connector` interface, `DomainEventType` ↔ constant-string mapping helpers |
| `libs/auth` | JWT strategy, Google OAuth strategy, `JwtAuthGuard`, `HouseholdRoleGuard`, token service (issue/verify/rotate) |
| `libs/database` | `PrismaService` (injectable NestJS wrapper around `PrismaClient`), re-exported generated types |
| `libs/rules-engine` | Rule evaluation core — v1 hardcoded functions per event type, v2 DSL interpreter |
| `libs/notifications` | Channel adapters: `WhatsAppChannel`, `EmailChannel`, `PushChannel` (stretch), all implementing one `NotificationChannel` interface |
| `libs/connectors/gmail`, `/calendar`, `/manual-entry`, `/ocr` | One `Connector` implementation each |
| `libs/shared/constants` | `EVENT_TYPES`, `QUEUE_NAMES`, `API_ROUTES`, `ERROR_CODES`, `ROLES`, `NOTIFICATION_CHANNELS` — see §17.2 of the architecture guide |
| `libs/shared/config` | zod env schema, typed `ConfigService` |
| `libs/shared/utils` | Pure helpers: currency formatting, date math, dedupe-key hashing |
| `libs/ui` | shadcn/ui components, themed per §4 below |

### 2.4 `apps/web` — Next.js route groups

| Route group | Purpose | Calls |
|---|---|---|
| `app/(auth)/login`, `/signup` | Native login form, "Continue with Google" button | `AuthModule` |
| `app/(dashboard)/overview` | Household activity timeline / digest history | `EventsModule`, `NotificationsModule` |
| `app/(dashboard)/documents` | Document list, expiry badges, add/edit form | `DocumentsModule` |
| `app/(dashboard)/bills` | Bill list, due-date badges | `BillsModule` |
| `app/(dashboard)/tasks` | Task board (open/in-progress/done), assignment | `TasksModule` |
| `app/(dashboard)/rules` | Rule configuration UI (v2) | `RulesModule` |
| `app/(dashboard)/connectors` | Connect Gmail/Calendar, WhatsApp opt-in status | `ConnectorsModule` |
| `app/(dashboard)/settings/household` | Members, roles, invite link | `HouseholdModule` |

---

## 3. Prisma Schema — Module by Module

Prisma's **multi-file schema** support has been generally available since ORM v6.7 — no preview flag needed. Split `prisma/schema.prisma` into one file per module under `prisma/schema/`, matching the module map in §2 exactly. Prisma merges them into one logical schema at generate/migrate time, so cross-file relations (e.g. `Task.assignee → User`) work normally.

```
prisma/
├── schema/
│   ├── schema.prisma       # datasource + generator only
│   ├── auth.prisma          # User, RefreshToken
│   ├── household.prisma     # Household, HouseholdMember, HouseholdRole
│   ├── connectors.prisma    # ConnectorConfig, ConnectorKey
│   ├── events.prisma        # EventLog, DomainEventType
│   ├── rules.prisma         # Rule
│   ├── documents.prisma     # Document, DocumentType
│   ├── bills.prisma         # Bill
│   ├── tasks.prisma         # Task, TaskStatus
│   └── notifications.prisma # Notification, NotificationChannel, NotificationStatus
└── migrations/
```

```ts
// prisma.config.ts (repo root)
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: './prisma/schema',
});
```

### `schema/schema.prisma`

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}
```

### `schema/auth.prisma` — backs `AuthModule`

```prisma
model User {
  id              String    @id @default(uuid())
  email           String    @unique
  passwordHash    String?   // null for Google-only accounts
  googleId        String?   @unique
  name            String
  emailVerifiedAt DateTime?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  memberships   HouseholdMember[]
  refreshTokens RefreshToken[]
  assignedTasks Task[]            @relation("TaskAssignee")

  @@map("users")
}

model RefreshToken {
  id          String    @id @default(uuid())
  userId      String
  jti         String    @unique
  hashedToken String
  familyId    String    // rotation family — reuse of any token in the family revokes the whole family
  revokedAt   DateTime?
  expiresAt   DateTime
  createdAt   DateTime  @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([familyId])
  @@map("refresh_tokens")
}
```

### `schema/household.prisma` — backs `HouseholdModule`

```prisma
enum HouseholdRole {
  OWNER
  MEMBER
}

model Household {
  id        String   @id @default(uuid())
  name      String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  members       HouseholdMember[]
  connectors    ConnectorConfig[]
  events        EventLog[]
  rules         Rule[]
  documents     Document[]
  bills         Bill[]
  tasks         Task[]
  notifications Notification[]

  @@map("households")
}

model HouseholdMember {
  id          String        @id @default(uuid())
  householdId String
  userId      String
  role        HouseholdRole @default(MEMBER)
  joinedAt    DateTime      @default(now())

  household Household @relation(fields: [householdId], references: [id], onDelete: Cascade)
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([householdId, userId])
  @@map("household_members")
}
```

### `schema/connectors.prisma` — backs `ConnectorsModule`

```prisma
enum ConnectorKey {
  GMAIL
  CALENDAR
  MANUAL
  OCR
  WHATSAPP
}

model ConnectorConfig {
  id          String       @id @default(uuid())
  householdId String
  key         ConnectorKey
  enabled     Boolean      @default(true)
  credentials Json?        // encrypted at the application layer before it ever reaches Prisma — never store plaintext OAuth tokens
  lastRunAt   DateTime?
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt

  household Household @relation(fields: [householdId], references: [id], onDelete: Cascade)

  @@unique([householdId, key])
  @@map("connector_configs")
}
```

### `schema/events.prisma` — backs `EventsModule` and the pipeline

```prisma
enum DomainEventType {
  BILL_DETECTED
  DOCUMENT_EXPIRING
  MAINTENANCE_DUE
  TASK_EXTRACTED
}

model EventLog {
  id          String          @id @default(uuid())
  householdId String
  type        DomainEventType
  source      ConnectorKey
  payload     Json
  dedupeKey   String          @unique   // the idempotency guarantee from §8 of the architecture guide lives here
  occurredAt  DateTime
  processedAt DateTime?
  createdAt   DateTime        @default(now())

  household     Household      @relation(fields: [householdId], references: [id], onDelete: Cascade)
  notifications Notification[]

  @@index([householdId, type])
  @@map("event_log")
}
```

> **Note on enum naming:** Prisma enum members are `SCREAMING_SNAKE_CASE` by DB convention here, while `libs/shared/constants`'s `EVENT_TYPES` uses PascalCase string values (`'BillDetected'`) to match the wire event contract in `libs/domain`. `libs/domain` owns a small `toDomainEventType()` / `fromPrismaEventType()` mapping pair at the boundary — a deliberate, documented translation, not an inconsistency (worth its own line in `0006-constants-and-naming-conventions.md`).

### `schema/rules.prisma` — backs `RulesModule`

```prisma
model Rule {
  id          String          @id @default(uuid())
  householdId String
  name        String
  eventType   DomainEventType
  definition  Json            // unused in v1 (hardcoded rules); v2 declarative rule body, see §9 of the architecture guide
  isActive    Boolean         @default(true)
  createdAt   DateTime        @default(now())
  updatedAt   DateTime        @updatedAt

  household Household @relation(fields: [householdId], references: [id], onDelete: Cascade)

  @@map("rules")
}
```

### `schema/documents.prisma` — backs `DocumentsModule`

```prisma
enum DocumentType {
  PASSPORT
  INSURANCE
  WARRANTY
  REGISTRATION
  OTHER
}

model Document {
  id          String       @id @default(uuid())
  householdId String
  type        DocumentType
  label       String
  expiresOn   DateTime
  notes       String?
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt

  household Household @relation(fields: [householdId], references: [id], onDelete: Cascade)

  @@index([householdId, expiresOn])
  @@map("documents")
}
```

### `schema/bills.prisma` — backs `BillsModule`

```prisma
model Bill {
  id          String   @id @default(uuid())
  householdId String
  vendor      String
  amount      Decimal  @db.Decimal(10, 2)
  currency    String   @default("INR")
  dueDate     DateTime
  isRecurring Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  household Household @relation(fields: [householdId], references: [id], onDelete: Cascade)

  @@index([householdId, dueDate])
  @@map("bills")
}
```

### `schema/tasks.prisma` — backs `TasksModule`

```prisma
enum TaskStatus {
  OPEN
  IN_PROGRESS
  DONE
}

model Task {
  id          String     @id @default(uuid())
  householdId String
  description String
  assigneeId  String?
  status      TaskStatus @default(OPEN)
  dueOn       DateTime?
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt

  household Household @relation(fields: [householdId], references: [id], onDelete: Cascade)
  assignee  User?      @relation("TaskAssignee", fields: [assigneeId], references: [id])

  @@map("tasks")
}
```

### `schema/notifications.prisma` — backs `NotificationsModule` / `WhatsAppModule`

```prisma
enum NotificationChannel {
  EMAIL
  WHATSAPP
  PUSH
  DASHBOARD
}

enum NotificationStatus {
  PENDING
  SENT
  FAILED
}

model Notification {
  id          String              @id @default(uuid())
  householdId String
  eventId     String?
  channel     NotificationChannel
  status      NotificationStatus  @default(PENDING)
  payload     Json
  sentAt      DateTime?
  failReason  String?
  createdAt   DateTime            @default(now())

  household Household @relation(fields: [householdId], references: [id], onDelete: Cascade)
  event     EventLog? @relation(fields: [eventId], references: [id])

  @@map("notifications")
}
```

### Kickstart commands

```bash
pnpm add -D prisma
pnpm add @prisma/client
mkdir -p prisma/schema
# create prisma.config.ts and the files above, then:
pnpm prisma migrate dev --name init
pnpm prisma generate
```

---

## 4. Design System — Tailwind Theme

### 4.1 The primary color

**Primary — Clay `#BD5B2C`** (`hsl(20 62% 44%)`) — a warm, grounded terracotta. It's a deliberate departure from the generic indigo/blue every SaaS dashboard defaults to, and it's on-brand: a cairn is stacked stone and earth, so the palette is built around clay and stone tones instead of arbitrary brand blue. Worth stating plainly in a portfolio walkthrough — "I chose the palette to match the product's name and metaphor" is a small, real design-system decision, not decoration.

Neutral base is Tailwind's built-in **Stone** scale (used as-is, no need to redefine it — it's already well-tuned). Semantic colors: **Moss** (custom, success/positive), Tailwind's default **Amber** (warning), Tailwind's default **Red** (destructive — kept as the universally-recognized danger color rather than re-skinned, since clarity matters more than branding for errors).

### 4.2 Full color scales

```ts
// libs/ui/src/theme/colors.ts
export const clay = {
  50: '#FBF3EE',
  100: '#F6E3D6',
  200: '#EBC5AE',
  300: '#DFA37E',
  400: '#D07F4F',
  500: '#BD5B2C', // primary
  600: '#9F4922',
  700: '#7E3A1B',
  800: '#602C15',
  900: '#46200F',
  950: '#2C1409',
} as const;

export const moss = {
  50: '#F1F8F1',
  100: '#DFF0DF',
  200: '#BFE0C0',
  300: '#98CC9B',
  400: '#6FB374',
  500: '#4C9651', // success
  600: '#3B7A40',
  700: '#2F6133',
  800: '#244A27',
  900: '#19351C',
} as const;
```

### 4.3 shadcn/ui CSS variables (light + dark)

```css
/* apps/web/app/globals.css */
@layer base {
  :root {
    --background: 30 20% 99%;
    --foreground: 20 14% 12%;

    --card: 30 20% 99%;
    --card-foreground: 20 14% 12%;

    --popover: 30 20% 99%;
    --popover-foreground: 20 14% 12%;

    --primary: 20 62% 44%;          /* clay-500 */
    --primary-foreground: 30 40% 97%;

    --secondary: 30 10% 94%;        /* stone-100 */
    --secondary-foreground: 20 14% 15%;

    --muted: 30 10% 94%;
    --muted-foreground: 25 6% 45%;  /* stone-500 */

    --accent: 20 45% 92%;           /* clay-100 */
    --accent-foreground: 20 62% 25%;

    --destructive: 0 72% 51%;
    --destructive-foreground: 0 0% 98%;

    --success: 122 30% 40%;         /* moss-500 */
    --success-foreground: 0 0% 98%;

    --warning: 38 92% 50%;          /* amber-500 */
    --warning-foreground: 26 40% 15%;

    --border: 30 10% 88%;
    --input: 30 10% 88%;
    --ring: 20 62% 44%;

    --radius: 0.625rem;
  }

  .dark {
    --background: 20 14% 8%;
    --foreground: 30 20% 96%;

    --card: 20 14% 10%;
    --card-foreground: 30 20% 96%;

    --popover: 20 14% 10%;
    --popover-foreground: 30 20% 96%;

    --primary: 20 65% 55%;          /* lighter clay for contrast on dark bg */
    --primary-foreground: 20 30% 10%;

    --secondary: 20 10% 16%;
    --secondary-foreground: 30 15% 92%;

    --muted: 20 10% 16%;
    --muted-foreground: 25 8% 60%;

    --accent: 20 30% 20%;
    --accent-foreground: 30 40% 92%;

    --destructive: 0 63% 48%;
    --destructive-foreground: 0 0% 98%;

    --success: 122 28% 48%;
    --success-foreground: 0 0% 98%;

    --warning: 38 85% 55%;
    --warning-foreground: 26 40% 10%;

    --border: 20 10% 20%;
    --input: 20 10% 20%;
    --ring: 20 65% 55%;
  }
}
```

### 4.4 `tailwind.config.ts`

```ts
import type { Config } from 'tailwindcss';
import { clay, moss } from './libs/ui/src/theme/colors';

const config: Config = {
  darkMode: ['class'],
  content: [
    './apps/web/app/**/*.{ts,tsx}',
    './apps/web/components/**/*.{ts,tsx}',
    './libs/ui/src/**/*.{ts,tsx}',
  ],
  theme: {
    container: { center: true, padding: '1.5rem', screens: { '2xl': '1280px' } },
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: { DEFAULT: 'hsl(var(--card))', foreground: 'hsl(var(--card-foreground))' },
        popover: { DEFAULT: 'hsl(var(--popover))', foreground: 'hsl(var(--popover-foreground))' },
        primary: { DEFAULT: 'hsl(var(--primary))', foreground: 'hsl(var(--primary-foreground))' },
        secondary: { DEFAULT: 'hsl(var(--secondary))', foreground: 'hsl(var(--secondary-foreground))' },
        muted: { DEFAULT: 'hsl(var(--muted))', foreground: 'hsl(var(--muted-foreground))' },
        accent: { DEFAULT: 'hsl(var(--accent))', foreground: 'hsl(var(--accent-foreground))' },
        destructive: { DEFAULT: 'hsl(var(--destructive))', foreground: 'hsl(var(--destructive-foreground))' },
        success: { DEFAULT: 'hsl(var(--success))', foreground: 'hsl(var(--success-foreground))' },
        warning: { DEFAULT: 'hsl(var(--warning))', foreground: 'hsl(var(--warning-foreground))' },
        // raw scales for one-off utility classes, e.g. bg-clay-100
        clay,
        moss,
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        'accordion-down': { from: { height: '0' }, to: { height: 'var(--radix-accordion-content-height)' } },
        'accordion-up': { from: { height: 'var(--radix-accordion-content-height)' }, to: { height: '0' } },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
```

### 4.5 Typography

**Inter**, loaded via `next/font/google` in `apps/web/app/layout.tsx` — Next.js self-hosts the font files at build time, so there's no runtime call to Google's CDN (keeps it fast and keeps it off the "external dependency" list, not that it costs anything either way).

```ts
// apps/web/app/layout.tsx
import { Inter } from 'next/font/google';
const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
```

Stick to Tailwind's default type scale (`text-sm` for body copy, `text-2xl font-semibold` for page titles, `text-xs text-muted-foreground` for meta text) rather than inventing a custom scale — one less thing to maintain, and shadcn's components already assume it.

### 4.6 Semantic color usage (where it actually matters in this app)

| State | Token | Example |
|---|---|---|
| Document/bill overdue | `destructive` | Red badge, "Expired 3 days ago" |
| Due soon (≤30 days) | `warning` | Amber badge, "Renews in 12 days" |
| Healthy / paid / done | `success` | Moss badge, "Up to date" |
| Primary actions | `primary` | "Add document", "Invite member" buttons |
| Household/member chrome | `secondary` / `muted` | Sidebar, cards, less prominent text |

This mapping is what makes the dashboard readable at a glance — the entire point of the product (§1 of the architecture guide: *noticing*, not just recording) — so keep it consistent rather than reaching for arbitrary colors per component.

---

## 5. Kickstart Checklist

- [ ] `prisma/schema/*.prisma` files from §3 created, `prisma migrate dev --name init` run against the local Docker Postgres.
- [ ] `libs/database`'s `PrismaService` wired into `AppModule`.
- [ ] `AuthModule` + `HouseholdModule` scaffolded (M1).
- [ ] `globals.css` + `tailwind.config.ts` from §4 in place before any UI work starts — building components against the real theme from day one avoids a re-skin pass later.
- [ ] First shadcn components installed (`button`, `card`, `badge`, `input`, `form`) and themed per §4.6.
- [ ] `EventsModule`, one connector, `RulesModule` (v1), `NotificationsModule` (email) — M2, the first demoable slice.