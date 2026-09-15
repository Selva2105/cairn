# Cairn

Household Operations Platform — a self-hosted, event-driven system that watches for the small signals of household/personal life (renewing bills, expiring documents, overdue maintenance, buried action items) and routes them to the right person through the right channel, before they become emergencies.

Full design spec and build plan: **[ARCHITECTURE.md](./ARCHITECTURE.md)**. Roadmap and milestone status: **[docs/roadmap.md](./docs/roadmap.md)**.

## Getting started

```bash
pnpm install
docker compose -f infra/docker/docker-compose.yml up -d
cp .env.example .env
pnpm exec nx run-many -t serve -p web,api,worker,bot --parallel
```

## Workspace layout

See `ARCHITECTURE.md` §5 for the full monorepo layout and dependency rules, and `docs/CODING_STANDARDS.md` for naming/lint/hook conventions.

```bash
pnpm exec nx graph            # visualize the project dependency graph
pnpm exec nx run-many -t lint,typecheck,test,build --all
pnpm exec nx affected -t lint,typecheck,test,build   # only what changed vs. main
```
