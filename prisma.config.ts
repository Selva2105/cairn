import 'dotenv/config';

import { defineConfig } from 'prisma/config';

// Prisma's config-file format (unlike the old prisma.schema-only setup) doesn't auto-load
// .env -- load it explicitly so `prisma migrate`/`generate` see DATABASE_URL/DIRECT_DATABASE_URL.
export default defineConfig({
  schema: './prisma/schema',
  migrations: {
    path: './prisma/migrations',
  },
});
