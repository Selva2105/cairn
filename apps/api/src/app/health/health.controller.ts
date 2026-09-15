import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '@cairn/database';
import { AppConfigService } from '@cairn/shared-config';
import { API_ROUTES } from '@cairn/shared-constants';
import Redis from 'ioredis';

@Controller()
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
  ) {}

  @Get(API_ROUTES.HEALTH)
  async check(): Promise<{ status: 'ok'; database: 'ok'; redis: 'ok' }> {
    const [database, redis] = await Promise.allSettled([
      this.checkDatabase(),
      this.checkRedis(),
    ]);

    if (database.status === 'rejected' || redis.status === 'rejected') {
      throw new ServiceUnavailableException({
        status: 'error',
        database: database.status,
        redis: redis.status,
      });
    }

    return { status: 'ok', database: 'ok', redis: 'ok' };
  }

  private async checkDatabase(): Promise<void> {
    await this.prisma.$queryRaw`SELECT 1`;
  }

  private async checkRedis(): Promise<void> {
    const redis = new Redis(this.config.get('REDIS_URL'), {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
    });
    try {
      await redis.connect();
      await redis.ping();
    } finally {
      redis.disconnect();
    }
  }
}
