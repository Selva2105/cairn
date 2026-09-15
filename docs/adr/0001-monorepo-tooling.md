# 0001. Monorepo tooling: Nx vs Turborepo

Date: 2026-09-15

## Status

Accepted

## Context

Cairn is a single deployable product split across four apps (`web`, `api`, `worker`, `bot`) and a growing set of shared libraries (`domain`, `auth`, `connectors/*`, `rules-engine`, `notifications`, `database`, `ui`, `shared/*`). All of them share one language (TypeScript) and one release cadence, which rules out separate repos — the cost of coordinating cross-repo versioning would dwarf the benefit for a project this size. That leaves a choice of monorepo tooling: Nx or Turborepo were the two realistic options.

Turborepo is lighter to adopt — it's mostly a fast task runner with caching — but it has no opinion about dependency direction between packages. Nothing stops `libs/connectors/gmail` from importing `apps/api` internals by accident; the only guard is code review discipline.

Nx additionally provides:

- **Enforced module boundaries** (`@nx/enforce-module-boundaries`) via tags — a lint rule, not just a convention, that fails CI when a lib crosses a dependency line it shouldn't (§17.3 of `ARCHITECTURE.md`).
- **`nx affected`** — computes the project graph and only lints/tests/builds what actually changed relative to a base branch, so CI time scales with the size of a change, not the size of the repo.
- **Generators** — scaffolding (`nx g @nx/js:lib`, and later a custom connector generator, §17.7) that keeps every project's shape consistent instead of hand-copied boilerplate.
- **A visual project graph** (`nx graph`) for reasoning about the dependency structure as the number of libs grows.

## Decision

Use **Nx with pnpm workspaces** as the monorepo tool. `apps/*` may depend on `libs/*`; `libs/*` never depend on `apps/*`; every lib is tagged (`scope:*`, `type:*`) and constrained via `depConstraints` in the root `eslint.config.mjs`.

## Consequences

- Adding a new connector, or any new lib, goes through an Nx generator rather than copy-pasting a folder, keeping structure consistent (§17.7).
- The module-boundary lint rule is a real, demonstrable constraint — a failing CI check, not a diagram — when discussing why a connector can't reach into `apps/api`.
- Nx has a steeper learning curve than Turborepo and its own configuration surface (`nx.json`, per-project `package.json` `nx` blocks). That cost is paid once at setup (this milestone) and amortized over the life of the project.
- We are not using Nx Cloud (distributed task execution / remote caching) for this project — the workspace is small enough that local caching via `nx affected` is sufficient, and it avoids an external dependency for a self-hosted, portfolio-scale project.
