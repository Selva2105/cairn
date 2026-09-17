import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { QUEUE_NAMES } from '@cairn/shared-constants';
import type { Job } from 'bullmq';

import { BullmqTaskLogger } from './bullmq-task-logger.service';
import {
  type NotificationJobData,
  QueuedNotificationDispatchService,
} from './queued-notification-dispatch.service';

/**
 * Consumes outbound notification jobs from BullMQ queue 'notification-dispatch'.
 * Executes the concrete channel transmission (SMTP/Email or WhatsApp Graph API).
 * If a transient network failure occurs, BullMQ retries automatically up to 3 times
 * with exponential backoff before sending to the dead-letter state.
 */
@Processor(QUEUE_NAMES.NOTIFICATION_DISPATCH)
export class NotificationDispatchProcessor extends WorkerHost {
  constructor(
    private readonly queuedDispatch: QueuedNotificationDispatchService,
    private readonly taskLogger: BullmqTaskLogger,
  ) {
    super();
  }

  async process(job: Job<NotificationJobData>): Promise<void> {
    const { channelKey, payload } = job.data;
    await this.queuedDispatch.sendDirect(channelKey, payload);
  }

  @OnWorkerEvent('active')
  onActive(job: Job): void {
    this.taskLogger.logActive(QUEUE_NAMES.NOTIFICATION_DISPATCH, job);
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job): void {
    const { channelKey, payload } = (job.data as NotificationJobData) || {};
    this.taskLogger.logCompleted(
      QUEUE_NAMES.NOTIFICATION_DISPATCH,
      job,
      channelKey && payload?.to
        ? { channel: channelKey, to: payload.to }
        : undefined,
    );
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job | undefined, error: Error): void {
    this.taskLogger.logFailed(QUEUE_NAMES.NOTIFICATION_DISPATCH, job, error);
  }
}
