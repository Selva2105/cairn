import { Injectable } from '@nestjs/common';
import type { DomainEvent } from '@cairn/domain';
import { EVENT_TYPES } from '@cairn/shared-constants';

import { evaluateRule } from './dsl-interpreter';
import type { RuleDefinition } from './dsl-types';
import {
  evaluateBillDetected,
  evaluateDocumentExpiring,
  evaluateMaintenanceDue,
  evaluateTaskExtracted,
} from './hardcoded-rules';
import type { RuleAction } from './types';

@Injectable()
export class RulesEngineService {
  /**
   * `configuredRules` are a household's own v2 declarative rules for this event's type
   * (ARCHITECTURE.md §9) -- when present, they replace the v1 hardcoded default for that
   * event type entirely, so a household that's customized "document expiring" still gets the
   * v1 defaults for event types it hasn't touched.
   */
  evaluate(
    event: DomainEvent,
    configuredRules: RuleDefinition[] = [],
  ): RuleAction[] {
    // A fuzzy connector (Gmail/Calendar heuristic parsing, OCR) flagged this extraction as
    // low-confidence -- hold it for a household member to approve/dismiss instead of
    // notifying on data that might be wrong, regardless of the household's own rules.
    if (event.confidence === 'low') {
      return [{ action: 'review' }];
    }

    if (configuredRules.length > 0) {
      return configuredRules.flatMap((rule) => evaluateRule(rule, event));
    }

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
