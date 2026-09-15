import { Injectable } from '@nestjs/common';
import type { Notification } from '@cairn/database';
import { PrismaService } from '@cairn/database';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  list(householdId: string): Promise<Notification[]> {
    return this.prisma.notification.findMany({
      where: { householdId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }
}
