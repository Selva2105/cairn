import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import { QUEUE_NAMES } from '@cairn/shared-constants';
import {
  EmailChannel,
  NotificationDispatchService,
  type NotificationPayload,
  WhatsAppChannel,
} from '@cairn/notifications';

import { BullmqTaskLogger } from './bullmq-task-logger.service';

export interface NotificationJobData {
  channelKey: string;
  payload: NotificationPayload;
}

/**
 * Intercepts NotificationDispatchService.dispatch in apps/worker and offloads the outbound
 * message to the BullMQ 'notification-dispatch' queue. This decouples scanning and rules
 * evaluation from external network latency (SMTP or Meta WhatsApp Graph API) and enables
 * automatic retries with exponential backoff.
 */
@Injectable()
export class QueuedNotificationDispatchService extends NotificationDispatchService {
  constructor(
    emailChannel: EmailChannel,
    whatsAppChannel: WhatsAppChannel,
    @InjectQueue(QUEUE_NAMES.NOTIFICATION_DISPATCH)
    private readonly notificationQueue: Queue<NotificationJobData>,
    private readonly taskLogger: BullmqTaskLogger,
  ) {
    super(emailChannel, whatsAppChannel);
  }

  override async dispatch(
    channelKey: string,
    payload: NotificationPayload,
  ): Promise<void> {
    await this.notificationQueue.add(
      'send-notification',
      { channelKey, payload },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 3000 },
        removeOnComplete: { age: 86400 },
        removeOnFail: false,
      },
    );
    this.taskLogger.logEnqueued(
      QUEUE_NAMES.NOTIFICATION_DISPATCH,
      'send-notification',
      `Channel: ${channelKey} -> "${payload.to}"`,
    );
  }

  /**
   * Invoked by NotificationDispatchProcessor to perform the actual channel send.
   */
  async sendDirect(
    channelKey: string,
    payload: NotificationPayload,
  ): Promise<void> {
    await super.dispatch(channelKey, payload);
  }
}
