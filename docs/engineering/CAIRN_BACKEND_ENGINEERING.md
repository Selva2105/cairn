# Cairn — Backend Engineering Guide (`apps/api`)

Companion to `ARCHITECTURE.md` (§7 for the module list, §10 for auth design) and `ENGINEERING_KICKSTART.md` §2.1/§3. This doc is the one to open while actually writing controllers/services in `apps/api`.

---

## 1. Layered Architecture — Enforced, Not Just Advised

Every module follows the same three layers, strictly one-directional:

**Controller** — HTTP concerns only: route, status codes, pulling the authenticated user/household off the request (via a param decorator, not `req.user` scattered everywhere), delegating to a service. A controller method should read like a table of contents, not contain logic.

**Service** — business logic, the only layer allowed to call `PrismaService`, orchestrates across other services when a use case spans modules (e.g., `AuthService.signup()` calls `HouseholdService.createDefault()`).

**`PrismaService`** — from `libs/database`, injected only into services, never controllers. If you find yourself importing `PrismaService` into a controller, that's a lint-review flag, not a shortcut.

```ts
// apps/api/src/documents/documents.controller.ts
@Controller('households/:householdId/documents')
@UseGuards(JwtAuthGuard, HouseholdRoleGuard)
export class DocumentsController {
  constructor(private readonly documents: DocumentsService) {}

  @Post()
  create(
    @Param('householdId') householdId: string,
    @Body() dto: CreateDocumentDto,
  ) {
    return this.documents.create(householdId, dto);
  }
}
```

---

## 2. DTO & Validation — zod, Not class-validator

Reuse the same zod schemas from `libs/domain` that the frontend's forms validate against (`FRONTEND_ENGINEERING.md` §5) — one schema, enforced on both sides, instead of two parallel validation implementations that can drift.

```ts
// libs/domain/src/lib/documents.schema.ts
export const documentInputSchema = z.object({
  type: z.enum(['PASSPORT', 'INSURANCE', 'WARRANTY', 'REGISTRATION', 'OTHER']),
  label: z.string().min(1).max(120),
  expiresOn: z.coerce.date(),
  notes: z.string().max(500).optional(),
});
export type DocumentInput = z.infer<typeof documentInputSchema>;
```

```ts
// libs/auth/src/lib/zod-validation.pipe.ts
@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private schema: ZodSchema) {}
  transform(value: unknown) {
    const result = this.schema.safeParse(value);
    if (!result.success) throw new BadRequestException(result.error.flatten());
    return result.data;
  }
}
```

```ts
@Post()
create(@Body(new ZodValidationPipe(documentInputSchema)) dto: DocumentInput) { … }
```

---

## 3. Standardized Response & Error Shape

Every error response has the same envelope, keyed off `ERROR_CODES` from `libs/shared/constants` (never a raw string) — this is what lets the frontend map errors to fields/toasts reliably (§5 of `FRONTEND_ENGINEERING.md`):

```json
{
  "error": {
    "code": "AUTH_INVALID_CREDENTIALS",
    "message": "Email or password is incorrect."
  }
}
```

```ts
// apps/api/src/common/filters/all-exceptions.filter.ts
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();
    const { status, code, message } = mapExceptionToResponse(exception); // centralizes the HttpException → ERROR_CODES mapping
    res.status(status).json({ error: { code, message } });
  }
}
```

Register it globally in `main.ts` (`app.useGlobalFilters(new AllExceptionsFilter())`) so no controller needs its own try/catch for the common cases.

---

## 4. Auth Flow — Implementation Walkthrough

Full design rationale is in `ARCHITECTURE.md` §10; this is the request-by-request sequence to implement:

**Signup:** `POST /auth/signup` → validate DTO → hash password (argon2id) → `prisma.$transaction([createUser, createHousehold, createHouseholdMember(role: OWNER)])` (all-or-nothing — see `DATABASE_ENGINEERING.md` §5) → issue access + refresh tokens → set cookies → return the user profile (never the tokens themselves in the body).

**Login:** `POST /auth/login` → look up by email → `argon2.verify` → same token-issue step as signup.

**Google callback:** `GET /auth/google/callback` (Passport strategy already validated the Google profile before this handler runs) → find-or-create `User` by verified email → if new, create a default `Household` + `OWNER` membership, same as signup → issue tokens → redirect to `apps/web` with cookies set.

**Refresh:** `POST /auth/refresh` → read refresh token from cookie → look up by `jti` → check `revokedAt`/`expiresAt` → **if the token was already used** (not found, or found but marked used), revoke the entire `familyId` and force re-login (reuse-detection from `ARCHITECTURE.md` §10) → otherwise rotate: mark current row used, issue a new access + refresh pair in the same family.

Guard order on protected routes: `JwtAuthGuard` (valid access token) → `HouseholdRoleGuard` (role check via `@Roles('owner')` decorator, reads `householdId`/`role` off the validated JWT claims) → controller method. Both guards live in `libs/auth`, imported everywhere, never reimplemented per module.

---

## 5. Correlation IDs & Logging

An interceptor generates (or forwards, if already present) an `x-correlation-id` header on every request, and every `pino` log line for that request — and every subsequent queue job or notification dispatch tied to the same domain event — carries it. This is what makes it possible to trace one event's life end-to-end across the API, the pipeline, and notification delivery, per `ARCHITECTURE.md` §12.

```ts
// apps/api/src/common/interceptors/correlation-id.interceptor.ts
@Injectable()
export class CorrelationIdInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler) {
    const req = context.switchToHttp().getRequest();
    const correlationId = req.headers['x-correlation-id'] ?? randomUUID();
    req.correlationId = correlationId;
    return next.handle();
  }
}
```

---

## 6. API Documentation

`@nestjs/swagger` decorators on every DTO and controller, served at `/api/docs` — gated behind an env flag so it's on locally and off (or admin-only) in the free-tier deployment. Even solo, this doubles as your own reference while building the frontend, and it's a legitimate thing to screenshot for a portfolio.

---

## 7. Rate Limiting

`@nestjs/throttler` applied at minimum to `/auth/login` and `/auth/signup` — a handful of attempts per minute per IP — since these are the endpoints most worth protecting from brute force, and it's a five-line addition that's worth explicitly mentioning as a security decision rather than an afterthought.

---

## 8. The Internal Pipeline Endpoint

`POST /internal/pipeline/run` (§18.3 of `ARCHITECTURE.md`) is deliberately **not** behind `JwtAuthGuard` — Vercel Cron isn't a logged-in user. It's behind its own `CronSecretGuard` checking a shared-secret header against an env var, and it's the one endpoint that should never be exposed in the public Swagger docs.

---

## 9. Testing Conventions

- **Unit** — services, with `PrismaService` mocked; the rules engine and connector `normalize()` functions are tested in their own libs, not re-tested here.
- **Integration** — controllers against a real, containerized Postgres (Testcontainers) — this is what catches DTO/Prisma-schema mismatches unit tests with mocks can't.
- **E2E** — a handful of critical paths only (signup → login → create document → see it in the digest), run with Supertest against a fully bootstrapped Nest app; the bulk of UI-level e2e coverage lives in Playwright against `apps/web` instead (don't duplicate the same journey at both layers).

AAA structure (`// Arrange` / `// Act` / `// Assert`) as a comment convention in every spec file, per `ARCHITECTURE.md` §17.5's review checklist.
