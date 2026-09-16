import { config as loadEnv } from 'dotenv';

import { defineConfig } from 'prisma/config';

// Prisma's config-file format (unlike the old prisma.schema-only setup) doesn't auto-load
// .env -- load it explicitly so `prisma migrate`/`generate` see DATABASE_URL/DIRECT_DATABASE_URL.
// .env.local (local Postgres) takes precedence over .env (live Neon creds) when both exist,
// matching libs/shared/config's envFilePath order.
loadEnv({ path: '.env', quiet: true });
loadEnv({ path: '.env.local', override: true, quiet: true });

export default defineConfig({
  schema: './prisma/schema',
  migrations: {
    path: './prisma/migrations',
  },
});
