# 0004. Auth strategy: native auth + Google SSO vs NextAuth/Auth0

Date: 2026-09-15

## Status

Accepted (implementation lands in M1)

## Context

Cairn has three client surfaces that all need to authenticate against the same identity: the web dashboard (`apps/web`), the WhatsApp bot (`apps/bot`), and, later, any mobile/PWA client. A common shortcut for a Next.js app is to drop in NextAuth.js on the frontend. That works well when the frontend _is_ the whole application, but here it isn't: `apps/api` is a separate NestJS service that also has to independently trust a session, and `apps/bot` — which never renders a page — needs to validate the same identity from a WhatsApp-originated request.

Splitting session logic between a Next.js auth layer and a separate API means two implementations of "is this request authenticated," which have to be kept in sync by hand and are two places a bug can hide. The alternative is to make one process the single source of truth for issuing and validating credentials, and have every other client — web, bot, anything added later — treat it as an external identity provider.

## Decision

Auth is implemented natively in NestJS (`libs/auth`), with `apps/api` as the **single authority** that issues and validates tokens for every client. No NextAuth.js, no Auth0.

- **Password auth**: signup/login in `apps/api`, passwords hashed with **argon2id** (not bcrypt — argon2id is the current OWASP-recommended default and is itself a small, explainable choice: it's memory-hard, which makes GPU-based cracking meaningfully more expensive than bcrypt).
- **Google SSO**: OAuth 2.0 Authorization Code flow via `passport-google-oauth20`, implemented as a NestJS Passport strategy inside `libs/auth`. The API owns the entire flow — `apps/web` only redirects the browser to `GET /auth/google`; Google is used solely to prove identity, never as the session mechanism. First-time sign-in with no existing household creates one; an existing verified email links the Google identity to that account rather than creating a duplicate user.
- **Tokens**: short-lived access token (JWT, ~15 min; `sub`, `householdId`, `role`) as an `httpOnly`/`secure`/`sameSite=lax` cookie, never exposed to client-side JS. Longer-lived refresh token stored **hashed** in a `RefreshToken` table, **rotated on every use**, with **reuse detection** — presenting a refresh token twice revokes the entire token family and forces re-authentication. This is the mechanism that actually demonstrates understanding of how refresh tokens get stolen and replayed, rather than just naming a library that issues them.
- `apps/bot` validates the same access-token format via a shared guard from `libs/auth` — there is exactly one JWT verification implementation in the system.

## Consequences

- More code to write up front than wiring in NextAuth or Auth0 — that is the explicit trade-off being made: it demonstrates the ability to build auth, not just configure it.
- Every client (web, bot, future mobile) authenticates against one contract, so adding a new client never means adding a new auth implementation.
- The refresh-token rotation/reuse-detection design needs its own `RefreshToken` table and a background-free way to revoke a token family — this is scoped into M1, not deferred.
- If a future requirement needs a third-party IdP beyond Google (e.g. Apple, Microsoft), it plugs into `libs/auth` as another Passport strategy behind the same token-issuing core — the token model doesn't change.
