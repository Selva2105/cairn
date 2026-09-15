import type { NotificationChannelName } from '@cairn/shared-constants';

export interface RuleAction {
  action: 'notify';
  channel: NotificationChannelName;
  priority: 'low' | 'normal' | 'high';
}
