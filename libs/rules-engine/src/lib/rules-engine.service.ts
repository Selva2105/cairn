import { Injectable } from '@nestjs/common';
import type { DomainEvent } from '@cairn/domain';
import { EVENT_TYPES } from '@cairn/shared-constants';

import {
  evaluateBillDetected,
  evaluateDocumentExpiring,
  evaluateMaintenanceDue,
  evaluateTaskExtracted,
} from './hardcoded-rules';
import type { RuleAction } from './types';

@Injectable()
export class RulesEngineService {
  evaluate(event: DomainEvent): RuleAction[] {
    switch (event.type) {
      case EVENT_TYPES.BILL_DETECTED:
        return evaluateBillDetected(event);
      case EVENT_TYPES.DOCUMENT_EXPIRING:
        return evaluateDocumentExpiring(event);
      case EVENT_TYPES.MAINTENANCE_DUE:
        return evaluateMaintenanceDue(event);
      case EVENT_TYPES.TASK_EXTRACTED:
        return evaluateTaskExtracted(event);
      default:
        return [];
    }
  }
}
