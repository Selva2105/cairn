import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { API_ROUTES } from '@cairn/shared-constants';
import { IsOptional, IsString } from 'class-validator';

import { CronSecretGuard } from './cron-secret.guard';
import { PipelineService } from './pipeline.service';

class RunPipelineDto {
  @IsOptional()
  @IsString()
  householdId?: string;
}

@Controller()
export class PipelineController {
  constructor(private readonly pipelineService: PipelineService) {}

  @Post(API_ROUTES.PIPELINE.RUN)
  @UseGuards(CronSecretGuard)
  run(@Body() dto: RunPipelineDto) {
    return this.pipelineService.runOnce(dto.householdId);
  }
}
