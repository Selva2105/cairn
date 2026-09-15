# Coding Standards

Full detail lives in `ARCHITECTURE.md` §17 — this file is the quick-reference index a reviewer or AI coding agent should check first.

- **Naming** (§17.1): kebab-case + type suffix for NestJS files (`bill.service.ts`), PascalCase for React components, `use`-prefixed camelCase for hooks, kebab-case for plain utilities. Types/interfaces are `PascalCase` with no `I` prefix. Booleans are prefixed `is`/`has`/`should`/`can`. Every lib exposes exactly one `index.ts` barrel as its public API.
- **No magic strings** (§17.2): event types, queue names, routes, error codes, roles, cookie/header names are centralized as `as const` objects in `libs/shared/constants`, never inline literals repeated across files.
- **Module boundaries** (§17.3): every project is tagged (`scope:*`, `type:*`) in its `package.json` `nx` block; `@nx/enforce-module-boundaries` in `eslint.config.mjs` fails CI on a violation. `apps/*` depend on `libs/*`; `libs/*` never depend on `apps/*`; feature libs (connectors, auth, rules-engine, notifications) depend only on `domain` and `shared/*`, never on each other.
- **Git hooks** (§17.4): pre-commit runs `lint-staged` (ESLint `--fix` + Prettier on staged files); commit-msg enforces Conventional Commits via commitlint; pre-push runs `nx affected -t lint,test`.
- **Linting/formatting** (§17.5): ESLint (`@typescript-eslint` strict + module boundaries + import ordering), Prettier as the sole formatting authority, `.editorconfig` for cross-editor consistency, `tsconfig.base.json` with `strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`, `exactOptionalPropertyTypes` all on.
- **Env validation** (§17.6): `libs/shared/config` validates `process.env` once at boot with `zod`; a missing/malformed var fails startup immediately instead of a mystery runtime 500.
- **Scaffolding** (§17.7): new connectors are generated (`nx g @cairn/tools:connector <name>`), not hand-copied.
- **Review checklist** (§17.5): no `any` without justification, error paths handled, tests added for new logic, ADR added/updated if the change reflects a real decision, no new magic strings outside `libs/shared/constants`.
