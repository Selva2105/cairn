# 0009. Proxy /api/* through apps/web to make cross-domain auth cookies work

Date: 2026-09-18

## Status

Accepted

## Context

`apps/web` (Vercel) and `apps/api` (Render) are deployed on two different registrable
domains (§18 of ARCHITECTURE.md / [0008](0008-deployment-topology.md)). Auth uses httpOnly
cookies set by `apps/api` and forwarded manually by `apps/web`'s server (`api-client.ts`
reads the incoming request's cookies and attaches them to its own outbound fetch to the API).

That forwarding only works if the browser actually has the cookie to forward in the first
place. It didn't: the Google OAuth callback lands on the API's own domain
(`cairn-api-urnv.onrender.com`), so the cookie's `Domain` is scoped there. The browser is then
redirected to the web app's domain (`*.vercel.app`) — a cookie scoped to one registrable
domain is never sent on requests to a different one, full stop, independent of `SameSite`.
`apps/web`'s server-rendered `getSession()` therefore always saw no cookie, treated every
freshly-logged-in user as unauthenticated, and bounced them straight back to `/login` with no
error anywhere (a 401 is an expected, unlogged branch in `getSession()`).

Tuning `SameSite`/`Secure`/`Domain` on the cookie itself cannot fix this — two distinct
registrable domains structurally cannot share a cookie set by one and read by the other.

## Decision

Make `apps/web` reverse-proxy `/api/*` to `apps/api` via a Next.js rewrite
(`apps/web/next.config.js`), so the browser only ever talks to one origin
(`*.vercel.app`). Concretely:

- `next.config.js` adds `rewrites()`: `/api/:path*` → `${API_BASE_URL}/:path*`. Next's
  default "afterFiles" rewrite ordering means `apps/web`'s own real route,
  `/api/cron/trigger-pipeline`, still takes precedence and is never proxied.
- `NEXT_PUBLIC_API_BASE_URL` (read by every browser-facing fetch/link: `api-client-browser.ts`,
  the Google SSO `<a href>` in the login/signup/join forms) changes from the absolute Render
  URL to the relative path `/api`, so those requests resolve against the current origin and
  go through the rewrite instead of hitting Render directly.
- `GOOGLE_OAUTH_CALLBACK_URL` (Render env var) changes to the Vercel URL
  (`https://<vercel-domain>/api/auth/google/callback`) so Google redirects the browser to the
  proxy, not straight to Render. Google Cloud Console's Authorized redirect URIs needs this
  URL added.
- `COOKIE_DOMAIN` (Render env var) changes to the Vercel domain, since after proxying that's
  the only origin the browser ever perceives — a cookie scoped to `onrender.com` would once
  again never reach anything the browser thinks is on `*.vercel.app`.
- The server-only `API_BASE_URL` env var is unchanged (still the real Render URL) — it's used
  by the rewrite's destination and by server-to-server fetches (`api-client.ts`,
  `app/api/cron/trigger-pipeline/route.ts`), neither of which is subject to browser cookie
  scoping.

## Consequences

- One extra network hop for every browser-originated API call (browser → Vercel → Render)
  instead of a direct call — negligible for this app's traffic pattern, and Vercel's rewrite
  proxying is streamed, not buffered.
- If `apps/api` ever moves to a custom domain that shares a parent with `apps/web` (e.g.
  `api.example.com` + `app.example.com`), this proxy could be replaced with a shared
  `Domain=.example.com` cookie instead — either works from here; a custom domain wasn't in
  scope for the free-tier topology in [0008](0008-deployment-topology.md).
- `apps/api`'s own tests / direct API consumers (e.g. Postman, curl) are unaffected — they
  never went through cookies-via-browser in the first place.
