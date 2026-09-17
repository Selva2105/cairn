import { Module } from '@nestjs/common';
import { CairnPipelineModule } from '@cairn/pipeline';

import { HouseholdModule } from '../household/household.module';
import { CronSecretGuard } from './cron-secret.guard';
import { PipelineController } from './pipeline.controller';

@Module({
  imports: [CairnPipelineModule, HouseholdModule],
  controllers: [PipelineController],
  providers: [CronSecretGuard],
})
export class PipelineModule {}
