import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import type { AccessTokenPayload } from '@cairn/auth';
import { JwtAuthGuard } from '@cairn/auth';
import type { HouseholdMember } from '@cairn/database';
import { API_ROUTES } from '@cairn/shared-constants';

import { CurrentUser } from '../common/current-user.decorator';
import { UsersService } from '../users/users.service';
import { CreateInviteDto } from './dto/create-invite.dto';
import { JoinHouseholdDto } from './dto/join-household.dto';
import {
  HouseholdService,
  type HouseholdWithMembers,
} from './household.service';

@UseGuards(JwtAuthGuard)
@Controller()
export class HouseholdController {
  constructor(
    private readonly householdService: HouseholdService,
    private readonly usersService: UsersService,
  ) {}

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
    @Body() dto: CreateInviteDto,
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<{ inviteToken: string; emailSent: boolean }> {
    await this.householdService.requireOwnerMembership(user.sub, id);
    const inviteToken = this.householdService.createInvite(id);

    if (!dto.email) {
      return { inviteToken, emailSent: false };
    }

    const [household, inviter] = await Promise.all([
      this.householdService.findById(id),
      this.usersService.findPublicProfile(user.sub),
    ]);
    if (!household || !inviter) {
      throw new NotFoundException('Household or user not found');
    }

    await this.householdService.sendInviteEmail({
      to: dto.email,
      householdName: household.name,
      inviterName: inviter.name,
      token: inviteToken,
    });
    return { inviteToken, emailSent: true };
  }

  @Post(`${API_ROUTES.HOUSEHOLDS.BASE}/join`)
  join(
    @Body() dto: JoinHouseholdDto,
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<HouseholdMember> {
    return this.householdService.joinWithInvite(user.sub, dto.token);
  }
}
