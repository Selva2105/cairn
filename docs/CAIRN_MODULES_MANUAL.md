# Cairn — Platform Modules Manual & Feature Guide

This manual provides comprehensive, production-grade documentation for every module in Cairn. For each module, you will find its architecture, full feature list, end-user instructions (how to use it in the web dashboard), developer instructions (REST API endpoints, DTOs, and services), database models, and common troubleshooting tips.

---

## Table of Contents

1. [Architecture & System Dependency Map](#1-architecture--system-dependency-map)
2. [Authentication & Identity Module](#2-authentication--identity-module)
3. [Household & Multi-Tenancy Module](#3-household--multi-tenancy-module)
4. [Tasks Management Module](#4-tasks-management-module)
5. [Documents & Expiration Vault Module](#5-documents--expiration-vault-module)
6. [WhatsApp Virtual Assistant Module](#6-whatsapp-virtual-assistant-module)
7. [Rules Engine & Automation Module](#7-rules-engine--automation-module)
8. [Pipeline & Event Ingestion Module](#8-pipeline--event-ingestion-module)
9. [External Connectors Suite (Gmail, Calendar, OCR, Manual)](#9-external-connectors-suite)
10. [Notification Dispatcher Module](#10-notification-dispatcher-module)
11. [UI Design System & Global Navigation](#11-ui-design-system--global-navigation)
12. [Cross-Module Integration Matrix & Quick Reference](#12-cross-module-integration-matrix--quick-reference)

---

## 1. Architecture & System Dependency Map

Cairn is organized as an **Nx monorepo** with strict architectural boundaries. Domain logic is separated into standalone TypeScript libraries (`libs/*`), while applications (`apps/*`) act as thin delivery channels (REST API, Web Frontend, Background Worker, and Bot).

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                             Apps & Presentation                             │
│                                                                             │
│   apps/web (Next.js 14)       apps/api (NestJS)        apps/worker (BullMQ) │
│   Port 4200 (Dashboard)       Port 3000 (REST /api)    Background Jobs      │
└──────────────────────┬──────────────────────┬──────────────────────┬────────┘
                       │                      │                      │
                       ▼                      ▼                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                                Core Libraries                               │
│                                                                             │
│  libs/auth             libs/pipeline           libs/rules-engine            │
│  libs/notifications    libs/connectors/*       libs/domain                  │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            Data & Infrastructure                            │
│                                                                             │
│  libs/database (Prisma ORM)    PostgreSQL (Tables)     Redis (BullMQ Queue) │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Authentication & Identity Module

### Purpose & Overview

The **Authentication Module** manages user registration, credential verification, session lifecycle, OAuth federation, and secure token rotation across web and mobile clients.

### Key Features

- **Argon2id Password Hashing**: Cryptographically secure hashing resistant to GPU cracking.
- **Google OAuth 2.0 SSO**: One-click authentication federated via Google.
- **Dual-Token System**:
  - Short-lived JWT access tokens (15-minute expiration) passed in headers or cookies.
  - Long-lived refresh tokens (7-day expiration) stored in HTTP-only, secure, `SameSite=Lax` cookies (`cairn_refresh_token`).
- **Refresh Token Rotation & Reuse Detection**: Every token refresh generates a new token family member and revokes the old one. If a revoked token is reused, the entire session family is instantly invalidated.
- **Forgot & Reset Password Flow**: Single-use, time-limited cryptographic tokens (`PasswordResetToken` table) with HTML email dispatch.
- **Automatic Household Provisioning**: Every newly registered user is immediately assigned as the `OWNER` of a personal default household.

### How to Use (End User)

1. **Sign Up**: Visit `/signup` &rarr; Enter your name, email, and password (min 8 chars) &rarr; Click **Create Account** or **Continue with Google**.
2. **Log In**: Visit `/login` &rarr; Enter credentials or sign in with Google &rarr; You are redirected to `/dashboard/overview`.
3. **Forgot Password**:
   - On the login screen, click **"Forgot your password?"** (or visit `/forgot-password`).
   - Enter your registered email address and click **Send reset link**.
   - Open your email, click the secure reset button (links to `/reset-password?token=<TOKEN>`).
   - Enter your new password and submit. You can now log in with the new password.
4. **Log Out**: Click your profile badge or the **Log Out** button in the dashboard navigation bar.

### Developer API Reference

- **Location**: `apps/api/src/app/auth`, `libs/auth`
- **Endpoints**:
  - `POST /api/auth/signup` — Body: `{ email, password, name }`
  - `POST /api/auth/login` — Body: `{ email, password }`
  - `POST /api/auth/logout` — Clears cookies and revokes refresh tokens.
  - `POST /api/auth/refresh` — Rotates refresh token cookie and issues new access token.
  - `GET /api/auth/google` — Initiates Google OAuth consent flow.
  - `GET /api/auth/google/callback` — Handles OAuth redirect and issues JWT session.
  - `POST /api/auth/forgot-password` — Body: `{ email }`
  - `POST /api/auth/reset-password` — Body: `{ token, newPassword }`

### Database Schema

- `User`: `id`, `email`, `passwordHash`, `name`, `phone`, `createdAt`, `updatedAt`
- `RefreshToken`: `id`, `userId`, `tokenHash`, `familyId`, `isRevoked`, `expiresAt`
- `PasswordResetToken`: `id`, `userId`, `tokenHash`, `expiresAt`, `usedAt`

---

## 3. Household & Multi-Tenancy Module

### Purpose & Overview

Cairn enforces a strict **multi-tenant household boundary**. All data (tasks, bills, documents, events, rules) belongs to a specific `Household`. Users interact with data strictly through their `HouseholdMember` memberships.

### Key Features

- **Role-Based Access Control**:
  - `OWNER`: Full administrative permissions, invite generation, household renaming, and billing control.
  - `MEMBER`: Full operational access to create and manage tasks, upload documents, and view digests.
- **8-Character Shareable Invite Codes**: Cryptographically secure, alphanumeric invite codes (`inviteCode`) with expiration dates (`inviteExpiresAt`).
- **One-Click Invite Links**: Direct URLs (`/join?code=ABC12345`) for inviting family or housemates.
- **International E.164 Phone Registration**: Standardized phone number management with native country flag selector (`react-phone-number-input`), enabling WhatsApp Assistant connectivity.
- **Member Directory**: Real-time listing of active household members with avatars and roles.

### How to Use (End User)

1. **View Household Settings**: Navigate to `/dashboard/settings/household`.
2. **Invite Family / Housemates**:
   - Under **Invite Members**, click **Generate New Invite Code**.
   - Copy the 8-character code or click **Copy Invite Link**.
   - Share the link with your housemate.
3. **Accept an Invite**:
   - The invited member logs into Cairn and navigates to the invite link or enters the code under **Join Household**.
   - Click **Join Household**. They are immediately added as a `MEMBER`.
4. **Register Mobile Phone for WhatsApp**:
   - Under **WhatsApp Integration & Phone Number**, select your country code from the dropdown.
   - Enter your mobile number (e.g. `+91 98765 43210`) and click **Save Phone Number**.

### Developer API Reference

- **Location**: `apps/api/src/app/household`, `apps/api/src/app/users`
- **Endpoints**:
  - `GET /api/households/:householdId` — Fetches household details and member roster.
  - `POST /api/households/:householdId/invite` — Generates a new 8-character invite code.
  - `POST /api/households/join` — Body: `{ inviteCode }` — Joins the authenticated user to the household.
  - `PATCH /api/users/profile` — Body: `{ phone, name }` — Updates user profile and E.164 phone.

### Database Schema

- `Household`: `id`, `name`, `inviteCode`, `inviteExpiresAt`, `createdAt`
- `HouseholdMember`: `id`, `userId`, `householdId`, `role` (`OWNER` | `MEMBER`), `joinedAt`

---

## 4. Tasks Management Module

### Purpose & Overview

The **Tasks Module** orchestrates day-to-day household maintenance, payment obligations, document renewals, and ad-hoc chores. Tasks can be manually created by users or automatically synthesized by the pipeline and WhatsApp Assistant.

### Key Features

- **Kanban-Style Status Progression**: `OPEN` &rarr; `IN_PROGRESS` &rarr; `DONE`.
- **Priority Classification**: `LOW`, `MEDIUM`, `HIGH`, `URGENT` with color-coded badges.
- **Due Date Scheduling**: Interactive date-time picker supporting exact deadlines.
- **Automated Synthesis**:
  - Inbound WhatsApp commands automatically spawn linked tasks (e.g. `bill Electricity 1200 15-Oct` creates a `Pay Electricity bill` task).
  - Document expiration alerts spawn renewal tasks.
- **Zero-Shadow Confirmation Dialogs**: Interactive `AlertDialog` prompts protect against accidental status transitions or deletions on touchscreens and desktop.

### How to Use (End User)

1. **View Tasks**: Navigate to `/dashboard/tasks`.
2. **Create a Task**:
   - In the task creation form, enter the description (e.g. _"Replace water purifier filter"_).
   - Select a priority level (Low, Medium, High, Urgent).
   - Select an optional due date and click **Create Task**.
3. **Progress Task Status**:
   - Click on the status badge (e.g. `OPEN`).
   - A zero-shadow confirmation dialog appears: _"Are you sure you want to mark this task as In Progress?"_
   - Click **Continue** to transition the state.
4. **Delete a Task**:
   - Click the red delete icon next to any task.
   - Confirm deletion in the modal dialog to permanently remove it.

### Developer API Reference

- **Location**: `apps/api/src/app/tasks`, `apps/web/src/app/dashboard/tasks`
- **Endpoints**:
  - `GET /api/households/:householdId/tasks` — List tasks filtered by status.
  - `POST /api/households/:householdId/tasks` — Body: `{ description, dueOn, priority, assigneeId }`
  - `PATCH /api/households/:householdId/tasks/:taskId` — Body: `{ status, priority, dueOn }`
  - `DELETE /api/households/:householdId/tasks/:taskId` — Removes task.

### Database Schema

- `Task`: `id`, `householdId`, `description`, `status` (`OPEN` | `IN_PROGRESS` | `DONE`), `priority` (`LOW` | `MEDIUM` | `HIGH` | `URGENT`), `dueOn`, `assigneeId`, `createdAt`

---

## 5. Documents & Expiration Vault Module

### Purpose & Overview

The **Documents Vault** is a secure registry for critical family documents (Passports, National IDs, Vehicle Insurance, Property Leases, Warranties). It monitors upcoming expiration dates and proactively warns household members before deadlines lapse.

### Key Features

- **10 Strict Document Categories**:
  - `IDENTITY` (Passports, Driver's Licenses, Aadhaar, Voter IDs)
  - `FINANCIAL` (Bank statements, Credit card agreements)
  - `LEGAL` (Wills, Power of Attorney)
  - `PROPERTY` (Rental agreements, Home deeds)
  - `VEHICLE` (Car insurance, Registration certificates, Pollution certs)
  - `MEDICAL` (Health insurance cards, Prescriptions)
  - `EDUCATION` (Degrees, Diplomas)
  - `EMPLOYMENT` (Contracts, Offer letters)
  - `TAX` (Income tax returns, Form 16)
  - `OTHER` (General warranties and manuals)
- **Visual Expiration Tracking**:
  - `Active` (Green badge): More than 30 days remaining.
  - `Expiring Soon` (Amber badge): Less than 30 days remaining.
  - `Expired` (Red badge): Expiration date is in the past.
- **Proactive Cron Scanning**: The BullMQ worker scans documents daily and issues alerts at 30 days, 14 days, and 1 day before expiration.

### How to Use (End User)

1. **View Vault**: Navigate to `/dashboard/documents`.
2. **Add a Document**:
   - Click **Add Document**.
   - Select the **Category** from the dropdown.
   - Enter a **Label** (e.g. _"Passport - Selva"_).
   - Pick the **Expiry Date** using the calendar picker.
   - Click **Save Document**.
3. **Inspect Status**: The table displays remaining days, status chips, and renewal action items.

### Developer API Reference

- **Location**: `apps/api/src/app/documents`, `apps/web/src/app/dashboard/documents`
- **Endpoints**:
  - `GET /api/households/:householdId/documents` — Returns all stored documents with computed status.
  - `POST /api/households/:householdId/documents` — Body: `{ type, label, expiresOn, fileUrl? }`
  - `DELETE /api/households/:householdId/documents/:docId` — Removes a document from the vault.

### Database Schema

- `Document`: `id`, `householdId`, `type` (`DocumentType` enum), `label`, `expiresOn`, `fileUrl`, `notes`, `createdAt`

---

## 6. WhatsApp Virtual Assistant Module

### Purpose & Overview

Cairn includes a zero-hardware virtual assistant connecting directly to the **Meta WhatsApp Cloud API (Graph API v21.0)**. Users interact with Cairn directly through their native WhatsApp messenger.

### Key Features

- **Zero SIM/Device Hardware**: Runs in the cloud via Meta's free development test numbers or dedicated business numbers.
- **Cryptographic Webhook Security**:
  - GET challenge handshake using custom `WHATSAPP_VERIFY_TOKEN`.
  - Inbound POST signature validation using HMAC-SHA256 (`WHATSAPP_APP_SECRET`).
- **E.164 Sender Resolution**: Inbound messages are mapped to the sender's user account and active household.
- **Natural Chat Commands**:
  - `bill <Vendor> <Amount> [DueDate]` &rarr; Creates `Bill` + `Task` + `EventLog`
  - `task <Description> [DueDate]` &rarr; Creates `Task` + `EventLog`
  - `doc <Type> [ExpiresOn]` &rarr; Creates `Document` + renewal `Task` + `EventLog`
- **Instant Two-Way Confirmations**: Automated response confirms data entry back to the user's chat.

### How to Use (End User)

1. Register your phone in `/dashboard/settings/household`.
2. Send any command to Cairn's WhatsApp number:
   - `bill Electricity 1200 15-Oct`
   - `task Fix kitchen sink tomorrow`
   - `doc passport 2030-05-20`
3. Cairn immediately replies: _"Got it -- added to your household tasks & digest."_
4. Refresh your dashboard to see the new task or bill on your board.

### Developer API Reference

- **Location**: `apps/api/src/app/whatsapp`, `libs/notifications/src/lib/whatsapp.channel.ts`
- **Endpoints**:
  - `GET /api/webhooks/whatsapp` — Meta handshake validation endpoint.
  - `POST /api/webhooks/whatsapp` — Inbound message receiver (`X-Hub-Signature-256` verified).
- **Setup Guide**: See [`WHATSAPP_INTEGRATION_GUIDE.md`](file:///Users/selvaganapthi/SelvaGanapathi/prj/cairn/docs/engineering/WHATSAPP_INTEGRATION_GUIDE.md) for full configuration details.

---

## 7. Rules Engine & Automation Module

### Purpose & Overview

The **Rules Engine** allows households to configure custom routing, alert thresholds, and priority escalations using a declarative JSON-based Domain-Specific Language (DSL).

### Key Features

- **Declarative JSON DSL**: Supports field conditions (e.g. `amount > 1000`, `vendor == "Electricity"`, `daysUntilDue <= 3`).
- **Action Triggers**:
  - `NOTIFY_EMAIL`: Dispatches custom email alerts.
  - `NOTIFY_WHATSAPP`: Sends proactive WhatsApp messages.
  - `ESCALATE_TASK`: Bumps task priority to `HIGH` or `URGENT`.
  - `ASSIGN_MEMBER`: Automatically assigns tasks to a specific family member.
- **Pre-Configured Default Rules**: Ready-to-use rules for utility bills and document expirations.
- **Active / Inactive Toggling**: Rules can be temporarily disabled without deletion.

### How to Use (End User)

1. **View Rules**: Navigate to `/dashboard/rules`.
2. **Create a Rule**:
   - Click **Create Rule**.
   - Enter a name (e.g. _"Large Bill Alert"_).
   - Select trigger event type (`BILL_DETECTED`).
   - Define condition (e.g. `amount >= 5000`).
   - Choose action (`NOTIFY_WHATSAPP`) and select target recipient.
   - Click **Save Rule**.
3. **Toggle Rules**: Use the active switch on any rule row to enable or disable it.

### Developer API Reference

- **Location**: `apps/api/src/app/rules`, `libs/rules-engine`
- **Endpoints**:
  - `GET /api/households/:householdId/rules` — List configured household rules.
  - `POST /api/households/:householdId/rules` — Body: `{ name, eventType, conditions, actions, isEnabled }`
  - `PATCH /api/households/:householdId/rules/:ruleId` — Update rule parameters.
  - `DELETE /api/households/:householdId/rules/:ruleId` — Delete rule.

---

## 8. Pipeline & Event Ingestion Module

### Purpose & Overview

The **Pipeline Module** is Cairn's central event broker. It ingests raw signals from all connectors, normalizes them into standardized domain events, filters duplicates, evaluates rules, creates action items, and compiles daily digests.

### Key Features

- **Universal Event Contract (`CairnEvent`)**: Standardized shape across all data sources:
  - `BILL_DETECTED`
  - `DOCUMENT_EXPIRING`
  - `TASK_EXTRACTED`
  - `MAINTENANCE_SCHEDULED`
- **Cryptographic Deduplication**: Events are hashed and checked against `EventLog`. Duplicate emails, duplicate webhook replays, and identical commands are dropped without double-processing.
- **Background Queue Processing**: Powered by **BullMQ** on **Redis** (`apps/worker`), ensuring fast, non-blocking HTTP responses.
- **Daily Digest Compiler**: Aggregates open tasks, bills due in 7 days, and expiring documents into a single morning digest email/WhatsApp message.
- **Activity Timeline**: Visual activity feed displayed on `/dashboard/overview` with metadata badges.

### How to Use (End User)

1. Navigate to `/dashboard/overview`.
2. Review the **Activity Timeline** for real-time audit logs of processed events.
3. Check the **Household Health Summary** for overdue tasks and pending bills.

### Developer API Reference

- **Location**: `apps/api/src/app/pipeline`, `libs/pipeline`, `apps/worker`
- **Endpoints**:
  - `POST /internal/pipeline/run` — Triggers an immediate pipeline scan (used by Vercel Cron or local debugging).
  - `GET /api/households/:householdId/events` — Returns event logs for the household.

---

## 9. External Connectors Suite

Cairn features modular connectors that extract household signals from external accounts:

### 1. Gmail Connector (`@cairn/connectors-gmail`)

- **Function**: Periodically scans authenticated user mailboxes via Google OAuth for utility bills, school fees, and subscription renewals.
- **Heuristics**: Uses regex patterns for keywords (`bill`, `due date`, `amount`, `statement`, `invoice`) and calculates a confidence score before emitting `BILL_DETECTED`.

### 2. Google Calendar Connector (`@cairn/connectors-calendar`)

- **Function**: Scans primary calendars for maintenance entries (e.g. _"HVAC service"_, _"Car oil change"_, _"Pest control"_).
- **Heuristics**: High confidence if event title follows `"Asset - Task"` naming conventions. Emits `MAINTENANCE_SCHEDULED`.

### 3. OCR Receipt Scanner (`@cairn/connectors-ocr`, `ReceiptsModule`)

- **Function**: Self-hosted **Tesseract.js** optical character recognition for scanned receipts, grocery slips, and utility bills.
- **Trigger**: On-demand via `POST /api/households/:householdId/receipts/scan` with base64 image or file upload.
- **Parsing**: Extracts vendor name, total currency amount, and receipt date.

### 4. Manual Entry Connector (`@cairn/connectors-manual-entry`)

- **Function**: Grammar parser powering both the WhatsApp Assistant and the web quick-entry bar.

---

## 10. Notification Dispatcher Module

### Purpose & Overview

The **Notifications Module** provides a unified delivery API that routes outbound reminders and digests across available communication channels.

### Delivery Channels

- **Email Channel (`libs/notifications/src/lib/email.channel.ts`)**:
  - Renders responsive, branded HTML templates.
  - Supports SMTP, Mailhog (local development), Resend, and SendGrid.
- **WhatsApp Channel (`libs/notifications/src/lib/whatsapp.channel.ts`)**:
  - Calls Meta Graph API `POST /v21.0/{WHATSAPP_PHONE_NUMBER_ID}/messages`.
  - Dispatches template messages and freeform 24-hour service window replies.
- **In-App Notification Feed**:
  - Emits timeline events viewable in the dashboard.

---

## 11. UI Design System & Global Navigation

### Design Philosophy

Cairn adheres strictly to a **zero-shadow, high-contrast, border-first aesthetic** (`shadow-none`). Depth and visual hierarchy are created through border contrasts (`border-border`), subtle background fills (`bg-muted/40`), and crisp typography.

### Core UI Features

- **Ambient Aurora Canvas (`ambient-aurora.tsx`)**: Subtle animated glowing gradients that bring the background to life without distracting from data.
- **Command Palette (`command-palette.tsx`)**: Global shortcut (`Cmd+K` or `Ctrl+K`) for instant keyboard navigation across Tasks, Documents, Rules, and Settings.
- **Theme Toggle (`theme-toggle.tsx`)**: Instant switching between Dark Mode and Light Mode with system-preference detection.
- **Native Country Flag Phone Picker (`country-phone-input.tsx`)**: Zero-shadow international phone selector powered by `react-phone-number-input`.
- **Accessible Zero-Shadow Dialogs (`AlertDialog`)**: Confirmation prompts before destructive or state-changing actions.

---

## 12. Cross-Module Integration Matrix & Quick Reference

| Module            | Web Route                                                  | API Route / Controller                                  | Key Database Tables                          | Primary Libraries                                    |
| :---------------- | :--------------------------------------------------------- | :------------------------------------------------------ | :------------------------------------------- | :--------------------------------------------------- |
| **Auth**          | `/login`, `/signup`, `/forgot-password`, `/reset-password` | `/api/auth` (`AuthController`)                          | `User`, `RefreshToken`, `PasswordResetToken` | `libs/auth`, `argon2`, `@nestjs/jwt`                 |
| **Household**     | `/dashboard/settings/household`, `/join`                   | `/api/households`, `/api/users`                         | `Household`, `HouseholdMember`               | `libs/domain`, `react-phone-number-input`            |
| **Tasks**         | `/dashboard/tasks`                                         | `/api/households/:id/tasks` (`TasksController`)         | `Task`                                       | `libs/domain`, `libs/ui`                             |
| **Documents**     | `/dashboard/documents`                                     | `/api/households/:id/documents` (`DocumentsController`) | `Document`                                   | `libs/domain`, `libs/database`                       |
| **WhatsApp**      | `/dashboard/settings/household` (Guide)                    | `/api/webhooks/whatsapp` (`WhatsAppController`)         | `Bill`, `Task`, `Document`, `EventLog`       | `libs/connectors/manual-entry`, `libs/notifications` |
| **Rules Engine**  | `/dashboard/rules`                                         | `/api/households/:id/rules` (`RulesController`)         | `Rule`                                       | `libs/rules-engine`                                  |
| **Pipeline**      | `/dashboard/overview`                                      | `/api/households/:id/events`, `/internal/pipeline/run`  | `EventLog`, `Digest`                         | `libs/pipeline`, `apps/worker`, `bullmq`             |
| **Connectors**    | N/A                                                        | `/api/households/:id/receipts/scan`                     | `EventLog`                                   | `libs/connectors/*`, `tesseract.js`                  |
| **Notifications** | N/A                                                        | Triggered internally via Pipeline / Events              | `NotificationLog`                            | `libs/notifications`, `nodemailer`                   |
| **Design System** | All routes                                                 | N/A                                                     | N/A                                          | `libs/ui`, `lucide-react`, `tailwind`                |
