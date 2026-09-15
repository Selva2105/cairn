import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import type { AccessTokenPayload } from '@cairn/auth';
import { JwtAuthGuard } from '@cairn/auth';
import type { Notification } from '@cairn/database';

import { CurrentUser } from '../common/current-user.decorator';
import { HouseholdService } from '../household/household.service';
import { NotificationsService } from './notifications.service';

@UseGuards(JwtAuthGuard)
@Controller('households/:householdId/notifications')
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly householdService: HouseholdService,
  ) {}

  @Get()
  async list(
    @Param('householdId') householdId: string,
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<Notification[]> {
    await this.householdService.requireMembership(user.sub, householdId);
    return this.notificationsService.list(householdId);
  }
}
