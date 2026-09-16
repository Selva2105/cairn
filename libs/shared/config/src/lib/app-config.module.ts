import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AppConfigService } from './app-config.service';
import { validateEnv } from './env.schema';

// dotenv (used internally by @nestjs/config) prints a promotional "tip" line on every load
// unless told not to -- silence it.
process.env.DOTENV_CONFIG_QUIET ??= 'true';

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // .env.local (local dev -- mailpit, local Postgres/Redis) takes precedence over
      // .env (live/production creds for Render+Vercel) when both exist.
      envFilePath: ['.env.local', '.env'],
      validate: validateEnv,
      // Prisma's generated client bundles its own dotenv and auto-loads plain .env (no
      // .env.local awareness) as soon as it's imported -- which, since PrismaModule is
      // imported before AppConfigModule in app.module.ts, happens before this ConfigModule
      // even runs. Without `override`, @nestjs/config refuses to touch process.env keys
      // Prisma already set, silently discarding .env.local's values. Force our (correctly
      // ordered) values to win instead.
      override: true,
    }),
  ],
  providers: [AppConfigService],
  exports: [AppConfigService],
})
export class AppConfigModule {}
