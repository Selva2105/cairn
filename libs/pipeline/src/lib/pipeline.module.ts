import { Module } from '@nestjs/common';
import { CairnNotificationsModule } from '@cairn/notifications';
import { CairnRulesEngineModule } from '@cairn/rules-engine';

import { BillDueScannerService } from './bill-due-scanner.service';
import { ConnectorRegistryService } from './connector-registry.service';
import { DocumentExpiryScannerService } from './document-expiry-scanner.service';
import { PipelineEventsService } from './pipeline-events.service';
import { PipelineService } from './pipeline.service';

@Module({
  imports: [CairnRulesEngineModule, CairnNotificationsModule],
  providers: [
    ConnectorRegistryService,
    PipelineEventsService,
    DocumentExpiryScannerService,
    BillDueScannerService,
    PipelineService,
  ],
  exports: [PipelineService],
})
export class CairnPipelineModule {}
