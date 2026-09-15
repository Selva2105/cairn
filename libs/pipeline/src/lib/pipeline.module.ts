import { Module } from '@nestjs/common';
import { CairnNotificationsModule } from '@cairn/notifications';
import { CairnRulesEngineModule } from '@cairn/rules-engine';

import { ConnectorRegistryService } from './connector-registry.service';
import { PipelineEventsService } from './pipeline-events.service';
import { PipelineService } from './pipeline.service';

@Module({
  imports: [CairnRulesEngineModule, CairnNotificationsModule],
  providers: [ConnectorRegistryService, PipelineEventsService, PipelineService],
  exports: [PipelineService],
})
export class CairnPipelineModule {}
