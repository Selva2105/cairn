import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import type { AccessTokenPayload } from '@cairn/auth';
import { JwtAuthGuard } from '@cairn/auth';
import type { HouseholdMember } from '@cairn/database';
import { API_ROUTES } from '@cairn/shared-constants';

import { CurrentUser } from '../common/current-user.decorator';
import { JoinHouseholdDto } from './dto/join-household.dto';
import {
  HouseholdService,
  type HouseholdWithMembers,
} from './household.service';

@UseGuards(JwtAuthGuard)
@Controller()
export class HouseholdController {
  constructor(private readonly householdService: HouseholdService) {}

  @Get(`${API_ROUTES.HOUSEHOLDS.BASE}/:id`)
  async get(
    @Param('id') id: string,
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<HouseholdWithMembers | null> {
    await this.householdService.requireMembership(user.sub, id);
    return this.householdService.findById(id);
  }

  @Post(API_ROUTES.HOUSEHOLDS.INVITE(':id'))
  async invite(
    @Param('id') id: string,
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<{ inviteToken: string }> {
    await this.householdService.requireMembership(user.sub, id);
    return { inviteToken: this.householdService.createInvite(id) };
  }

  @Post(`${API_ROUTES.HOUSEHOLDS.BASE}/join`)
  join(
    @Body() dto: JoinHouseholdDto,
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<HouseholdMember> {
    return this.householdService.joinWithInvite(user.sub, dto.token);
  }
}
