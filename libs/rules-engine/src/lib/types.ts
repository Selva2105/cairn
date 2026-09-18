import type { NotificationChannelName } from '@cairn/shared-constants';

export type RuleAction =
  | {
      action: 'notify';
      channel: NotificationChannelName;
      priority: 'low' | 'normal' | 'high';
    }
  | {
      // A low-confidence extraction (see the `confidence` field on DomainEvent) -- held out
      // of the normal notify flow until a household member approves or dismisses it.
      action: 'review';
    };
