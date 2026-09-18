import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import type { AccessTokenPayload } from '@cairn/auth';
import { JwtAuthGuard } from '@cairn/auth';
import { AppConfigService } from '@cairn/shared-config';
import { ConnectorKey } from '@cairn/database';

import { CurrentUser } from '../common/current-user.decorator';
import { HouseholdService } from '../household/household.service';
import { ConnectorsService } from './connectors.service';
import { ToggleConnectorDto } from './dto/toggle-connector.dto';

@Controller()
export class ConnectorsController {
  constructor(
    private readonly connectorsService: ConnectorsService,
    private readonly householdService: HouseholdService,
    private readonly config: AppConfigService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get('households/:householdId/connectors')
  async listStatuses(
    @Param('householdId') householdId: string,
    @CurrentUser() user: AccessTokenPayload,
  ) {
    await this.householdService.requireMembership(user.sub, householdId);
    return this.connectorsService.listStatuses(householdId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('households/:householdId/connectors/google/auth-url')
  async getGoogleAuthUrl(
    @Param('householdId') householdId: string,
    @Query('connector') connector: 'GMAIL' | 'CALENDAR' | 'ALL' = 'GMAIL',
    @CurrentUser() user: AccessTokenPayload,
  ) {
    await this.householdService.requireOwnerMembership(user.sub, householdId);
    const url = this.connectorsService.getGoogleAuthUrl(
      householdId,
      user.sub,
      connector,
    );
    return { url };
  }

  @Get('connectors/google/callback')
  async handleGoogleCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string | undefined,
    @Res() res: Response,
  ) {
    const webAppOrigin =
      this.config.get('WEB_APP_ORIGIN') || 'http://localhost:4200';

    if (error || !code || !state) {
      return res.redirect(
        `${webAppOrigin}/dashboard/settings/integrations?error=oauth_denied`,
      );
    }

    try {
      const result = await this.connectorsService.handleGoogleCallback(
        code,
        state,
      );
      return res.redirect(
        `${webAppOrigin}/dashboard/settings/integrations?connected=${result.connectorKey.toLowerCase()}`,
      );
    } catch {
      return res.redirect(
        `${webAppOrigin}/dashboard/settings/integrations?error=oauth_failed`,
      );
    }
  }

  @UseGuards(JwtAuthGuard)
  @Patch('households/:householdId/connectors/:key/toggle')
  async toggle(
    @Param('householdId') householdId: string,
    @Param('key') key: ConnectorKey,
    @Body() dto: ToggleConnectorDto,
    @CurrentUser() user: AccessTokenPayload,
  ) {
    await this.householdService.requireOwnerMembership(user.sub, householdId);
    await this.connectorsService.toggle(householdId, key, dto.enabled);
    return { success: true };
  }

  @UseGuards(JwtAuthGuard)
  @Delete('households/:householdId/connectors/:key')
  async disconnect(
    @Param('householdId') householdId: string,
    @Param('key') key: ConnectorKey,
    @CurrentUser() user: AccessTokenPayload,
  ) {
    await this.householdService.requireOwnerMembership(user.sub, householdId);
    await this.connectorsService.disconnect(householdId, key);
    return { success: true };
  }

  @UseGuards(JwtAuthGuard)
  @Post('households/:householdId/connectors/:key/sync')
  async sync(
    @Param('householdId') householdId: string,
    @Param('key') key: string,
    @CurrentUser() user: AccessTokenPayload,
  ) {
    await this.householdService.requireMembership(user.sub, householdId);
    return this.connectorsService.sync(
      householdId,
      key.toUpperCase() as 'GMAIL' | 'CALENDAR',
    );
  }
}
