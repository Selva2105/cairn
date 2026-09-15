import { Module } from '@nestjs/common';
import { CairnNotificationsModule } from '@cairn/notifications';
import { CairnRulesEngineModule } from '@cairn/rules-engine';

import { CronSecretGuard } from './cron-secret.guard';
import { PipelineController } from './pipeline.controller';
import { PipelineService } from './pipeline.service';

@Module({
  imports: [CairnRulesEngineModule, CairnNotificationsModule],
  controllers: [PipelineController],
  providers: [PipelineService, CronSecretGuard],
})
export class PipelineModule {}
