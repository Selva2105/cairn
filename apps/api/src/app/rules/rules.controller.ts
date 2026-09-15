import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import type { AccessTokenPayload } from '@cairn/auth';
import { JwtAuthGuard } from '@cairn/auth';
import type { Rule } from '@cairn/database';

import { CurrentUser } from '../common/current-user.decorator';
import { HouseholdService } from '../household/household.service';
import { CreateRuleDto } from './dto/create-rule.dto';
import { UpdateRuleDto } from './dto/update-rule.dto';
import { RulesService } from './rules.service';

// Owners manage rules/connectors; members see the dashboard -- ARCHITECTURE.md §10.
@UseGuards(JwtAuthGuard)
@Controller('households/:householdId/rules')
export class RulesController {
  constructor(
    private readonly rulesService: RulesService,
    private readonly householdService: HouseholdService,
  ) {}

  @Get()
  async list(
    @Param('householdId') householdId: string,
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<Rule[]> {
    await this.householdService.requireMembership(user.sub, householdId);
    return this.rulesService.list(householdId);
  }

  @Post()
  async create(
    @Param('householdId') householdId: string,
    @Body() dto: CreateRuleDto,
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<Rule> {
    await this.householdService.requireOwnerMembership(user.sub, householdId);
    return this.rulesService.create(householdId, dto);
  }

  @Patch(':id')
  async update(
    @Param('householdId') householdId: string,
    @Param('id') id: string,
    @Body() dto: UpdateRuleDto,
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<Rule> {
    await this.householdService.requireOwnerMembership(user.sub, householdId);
    return this.rulesService.update(householdId, id, dto);
  }

  @Delete(':id')
  async remove(
    @Param('householdId') householdId: string,
    @Param('id') id: string,
    @CurrentUser() user: AccessTokenPayload,
  ) {
    await this.householdService.requireOwnerMembership(user.sub, householdId);
    await this.rulesService.remove(householdId, id);
    return { status: 'ok' };
  }
}
