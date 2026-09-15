import { Module } from '@nestjs/common';
import { CairnPipelineModule } from '@cairn/pipeline';

import { CronSecretGuard } from './cron-secret.guard';
import { PipelineController } from './pipeline.controller';

@Module({
  imports: [CairnPipelineModule],
  controllers: [PipelineController],
  providers: [CronSecretGuard],
})
export class PipelineModule {}
