# Cairn — Frontend Engineering Guide (`apps/web`)

Companion to `ARCHITECTURE.md` and `ENGINEERING_KICKSTART.md`. This doc is the one to open while actually writing pages/components in `apps/web`.

---

## 1. Scope & Stack Recap

Next.js (App Router) + React + TypeScript, Tailwind + shadcn/ui themed per the Kickstart doc §4, talking to `apps/api` (NestJS) over HTTP — never directly to the database. `apps/web` has no business logic of its own beyond presentation, form validation, and light client-side state; everything else is a call to the API.

---

## 2. Folder Structure

```
apps/web/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── signup/page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx              # sidebar shell, session check
│   │   ├── overview/page.tsx
│   │   ├── documents/
│   │   │   ├── page.tsx
│   │   │   ├── loading.tsx
│   │   │   └── error.tsx
│   │   ├── bills/…
│   │   ├── tasks/…
│   │   ├── rules/…
│   │   ├── connectors/…
│   │   └── settings/household/…
│   ├── api/
│   │   └── cron/trigger-pipeline/route.ts   # Vercel Cron target, §18 of ARCHITECTURE.md
│   ├── layout.tsx                   # root layout, font + theme provider
│   └── globals.css                  # theme tokens, Kickstart doc §4.3
├── components/
│   ├── ui/                          # shadcn primitives (generated, mostly untouched)
│   └── features/                    # composed, feature-specific components
│       ├── documents/DocumentCard.tsx
│       ├── bills/BillBadge.tsx
│       └── tasks/TaskBoard.tsx
├── lib/
│   ├── api-client.ts                # typed fetch wrapper, §3
│   ├── session.ts                   # client-side session helpers
│   └── query-client.ts              # TanStack Query setup
├── hooks/
│   └── useHouseholdMembers.ts
└── middleware.ts                    # route protection, §4
```

Route groups (`(auth)`, `(dashboard)`) mirror the module map in `ENGINEERING_KICKSTART.md` §2.4 — one folder per feature, matching the API module it talks to.

---

## 3. Data Fetching Pattern

Two lanes, used deliberately for different things — don't blur them:

**Server Components for initial page data.** A page like `app/(dashboard)/documents/page.tsx` is an `async` Server Component that calls `apiFetch()` directly during render, forwarding the session cookie. This means the first paint always has real data, no client-side loading spinner for the common case, and no API keys or tokens ever reach the browser bundle.

```ts
// lib/api-client.ts
import { cookies } from 'next/headers';
import { API_ROUTES } from '@cairn/shared-constants';

export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const cookieHeader = cookies().toString();
  const res = await fetch(`${process.env.API_BASE_URL}${path}`, {
    ...init,
    headers: {
      ...init?.headers,
      cookie: cookieHeader,
      'content-type': 'application/json',
    },
    cache: 'no-store', // household data is per-user; don't let Next cache it across users
  });
  if (!res.ok) throw await ApiError.fromResponse(res);
  return res.json() as Promise<T>;
}
```

**TanStack Query, client-side, for anything interactive after load** — toggling a task's status, submitting a form without a full navigation, optimistic UI. Mutations call the same API through a thin client-side fetch wrapper, then invalidate the relevant query key or call `router.refresh()` to resync the Server Component tree. Don't reach for TanStack Query for the initial page load — that's what Server Components are for; using both for the same data just means two sources of truth.

After a mutation that should be reflected on next navigation (not just the current client state), call `revalidatePath()` from a Server Action or API route rather than relying on the client cache alone — the dashboard's whole point is trustworthy up-to-date state, so err toward revalidating.

---

## 4. Auth Integration

The API (§10 of `ARCHITECTURE.md`) sets the access token as an `httpOnly` cookie — `apps/web` never reads or stores the JWT itself, which is the point of `httpOnly`. Two consequences:

- **Route protection** happens in `middleware.ts`, which can't decode an `httpOnly` cookie's contents but can check for its _presence_ as a cheap first gate, redirecting to `/login` if absent. This is a UX optimization, not the real security boundary — every API endpoint still enforces its own `JwtAuthGuard`/`HouseholdRoleGuard` regardless of what the frontend thinks. Never treat the middleware check as authorization.
- **"Am I logged in" for the client UI** (e.g., showing the right nav state) comes from a lightweight `GET /auth/session` call the layout makes once, returning `{ userId, householdId, role }` — never the token itself.

```ts
// middleware.ts
export function middleware(request: NextRequest) {
  const hasSession = request.cookies.has('cairn_access');
  if (!hasSession && request.nextUrl.pathname.startsWith('/overview')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  return NextResponse.next();
}
```

Google SSO is a plain link/button to `GET {API_BASE_URL}/auth/google` — the entire OAuth dance happens on the API, and it redirects back to `apps/web` with the session cookie already set. There's no client-side OAuth library in `apps/web` at all.

---

## 5. Forms & Validation

`react-hook-form` + `@hookform/resolvers/zod`, and critically: **reuse the same zod schemas from `libs/domain`** that the API's DTOs validate against, rather than redefining validation rules in the frontend. One schema, two consumers — a form that passes client validation is guaranteed to pass the server's, because it's the literal same rule.

```tsx
// components/features/documents/DocumentForm.tsx
import { documentInputSchema } from '@cairn/domain';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

const form = useForm({ resolver: zodResolver(documentInputSchema) });
```

On submit, map any server-side validation or business-rule error (identified by `ERROR_CODES` from `libs/shared/constants`) back onto the relevant form field or a toast — never show a raw error message string from the API without going through this mapping, since that couples the UI's wording to backend implementation details.

---

## 6. Component Conventions

- `components/ui/` is shadcn-generated — treat it as close to vendor code; customize via the theme tokens (Kickstart §4), not by hand-editing generated files where avoidable.
- `components/features/*` is where actual product logic lives: composed, named for what they show (`DocumentCard`, `BillDueBadge`, `TaskBoard`), PascalCase files matching the export, per `ARCHITECTURE.md` §17.1.
- Keep Server vs Client Components deliberate: default to Server Components; add `'use client'` only where you need interactivity (form state, TanStack Query, local UI state) — every unnecessary client component is bundle size and hydration cost you didn't need to pay.
- Badge color mapping (overdue/due-soon/healthy) always goes through the semantic tokens in Kickstart §4.6 (`destructive`/`warning`/`success`), never a one-off hex value in a component — that mapping is the whole visual language of the app.

---

## 7. Theming Hookup

`app/layout.tsx` wires the Inter font variable and a `ThemeProvider` (from `next-themes`) so `data-theme`/`class="dark"` toggling works; `globals.css` is exactly the CSS variable block from `ENGINEERING_KICKSTART.md` §4.3. Don't duplicate color values anywhere else — if a component needs a color, it comes from a Tailwind utility class backed by a CSS variable, never a literal hex in a `style` prop or inline Tailwind arbitrary value.

---

## 8. Error & Loading States

Use Next.js's per-segment `loading.tsx` (skeletons matching the eventual layout, not a generic spinner) and `error.tsx` (a retry button, not a stack trace) for every route under `(dashboard)`. For client-side mutation errors, use a toast (`sonner`, themed with the `destructive`/`success` tokens) rather than inline alert boxes that shift layout.

---

## 9. Testing

- **E2E (Playwright)** — the primary test layer for `apps/web`, per `ARCHITECTURE.md` §13: login flow, adding a document, the full "seed a fake email → digest appears" smoke test hits this app's UI at the end.
- **Component tests (React Testing Library)** — reserved for genuinely complex client components with real logic (the rule builder, the task board's drag/status logic), not every presentational component. Don't test shadcn primitives themselves.

---

## 10. Performance Discipline

- `cache: 'no-store'` by default on API calls carrying per-user data (shown above) — correctness over caching cleverness for a household's private data.
- Use `next/image` for any user-uploaded content (receipt/document photos) rather than a bare `<img>`.
- Watch the client bundle: TanStack Query, react-hook-form, and any charting library belong only in the client components that need them, not the root layout.
