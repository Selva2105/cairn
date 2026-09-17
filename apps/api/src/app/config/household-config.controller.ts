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

import { CurrentUser } from '../common/current-user.decorator';
import { HouseholdService } from '../household/household.service';
import { AddDocumentTypeDto, UpdateConfigDto } from './dto/update-config.dto';
import { HouseholdConfigService } from './household-config.service';

@UseGuards(JwtAuthGuard)
@Controller('households/:householdId/config')
export class HouseholdConfigController {
  constructor(
    private readonly configService: HouseholdConfigService,
    private readonly householdService: HouseholdService,
  ) {}

  @Get()
  async getConfig(
    @Param('householdId') householdId: string,
    @CurrentUser() user: AccessTokenPayload,
  ) {
    await this.householdService.requireMembership(user.sub, householdId);
    return this.configService.getOrCreateConfig(householdId);
  }

  @Patch()
  async updateConfig(
    @Param('householdId') householdId: string,
    @Body() dto: UpdateConfigDto,
    @CurrentUser() user: AccessTokenPayload,
  ) {
    await this.householdService.requireMembership(user.sub, householdId);
    return this.configService.updateConfig(householdId, dto);
  }

  @Post('document-types')
  async addDocumentType(
    @Param('householdId') householdId: string,
    @Body() dto: AddDocumentTypeDto,
    @CurrentUser() user: AccessTokenPayload,
  ) {
    await this.householdService.requireMembership(user.sub, householdId);
    return this.configService.addDocumentType(householdId, dto.type);
  }

  @Delete('document-types/:type')
  async removeDocumentType(
    @Param('householdId') householdId: string,
    @Param('type') type: string,
    @CurrentUser() user: AccessTokenPayload,
  ) {
    await this.householdService.requireMembership(user.sub, householdId);
    return this.configService.removeDocumentType(householdId, type);
  }

  @Post('document-types/reset')
  async resetDocumentTypes(
    @Param('householdId') householdId: string,
    @CurrentUser() user: AccessTokenPayload,
  ) {
    await this.householdService.requireMembership(user.sub, householdId);
    return this.configService.resetDocumentTypes(householdId);
  }
}
