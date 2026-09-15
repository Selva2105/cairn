import { Controller, Get } from '@nestjs/common';
import { API_ROUTES } from '@cairn/shared-constants';
import { PrismaService } from '@cairn/database';

@Controller()
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get(API_ROUTES.HEALTH)
  async check() {
    await this.prisma.$queryRaw`SELECT 1`;
    return { status: 'ok' };
  }
}
