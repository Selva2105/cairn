import type {
  EventType,
  NotificationChannelName,
} from '@cairn/shared-constants';

import type { RuleAction } from './types';

/**
 * v2 declarative rule format -- see ARCHITECTURE.md §9. `field` is a dot-path into the
 * DomainEvent (e.g. 'payload.expiresOn'); `daysUntil` compares that field (parsed as a date)
 * against today.
 */
export interface RuleDefinition {
  id: string;
  on: EventType;
  when: {
    daysUntil: {
      field: string;
      lte?: number;
      gte?: number;
    };
  };
  then: Array<{
    action: 'notify';
    channel: NotificationChannelName;
    priority: Extract<RuleAction, { action: 'notify' }>['priority'];
  }>;
}
