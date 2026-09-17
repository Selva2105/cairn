import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import type { AccessTokenPayload } from '@cairn/auth';
import { JwtAuthGuard } from '@cairn/auth';
import { PipelineService } from '@cairn/pipeline';
import { API_ROUTES } from '@cairn/shared-constants';
import { IsOptional, IsString } from 'class-validator';

import { CurrentUser } from '../common/current-user.decorator';
import { HouseholdService } from '../household/household.service';
import { CronSecretGuard } from './cron-secret.guard';

class RunPipelineDto {
  @IsOptional()
  @IsString()
  householdId?: string;
}

@Controller()
export class PipelineController {
  constructor(
    private readonly pipelineService: PipelineService,
    private readonly householdService: HouseholdService,
  ) {}

  @Post(API_ROUTES.PIPELINE.RUN)
  @UseGuards(CronSecretGuard)
  run(@Body() dto: RunPipelineDto) {
    return this.pipelineService.runOnce(dto.householdId);
  }

  @Post('households/:householdId/pipeline/run')
  @UseGuards(JwtAuthGuard)
  async runHousehold(
    @Param('householdId') householdId: string,
    @CurrentUser() user: AccessTokenPayload,
  ) {
    await this.householdService.requireMembership(user.sub, householdId);
    return this.pipelineService.runOnce(householdId);
  }
}
