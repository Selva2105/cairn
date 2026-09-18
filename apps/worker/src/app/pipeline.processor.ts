import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { PipelineService, type PipelineRunSummary } from '@cairn/pipeline';
import { QUEUE_NAMES } from '@cairn/shared-constants';
import type { Job } from 'bullmq';

import { BullmqTaskLogger } from './bullmq-task-logger.service';

@Processor(QUEUE_NAMES.RULES_EVALUATION)
export class PipelineProcessor extends WorkerHost {
  constructor(
    private readonly pipeline: PipelineService,
    private readonly taskLogger: BullmqTaskLogger,
  ) {
    super();
  }

  async process(
    job: Job<{ householdId?: string }>,
  ): Promise<PipelineRunSummary> {
    return this.pipeline.runOnce(job.data?.householdId);
  }

  private isScheduledScan(job: Job): boolean {
    return (
      job.name === 'scheduled-pipeline-run' ||
      (typeof job.id === 'string' && job.id.startsWith('repeat:'))
    );
  }

  private hasAction(result?: PipelineRunSummary): boolean {
    if (!result) return false;
    return (
      (result.ingested ?? 0) > 0 ||
      (result.documentsScanned ?? 0) > 0 ||
      (result.billsScanned ?? 0) > 0 ||
      (result.processed ?? 0) > 0 ||
      (result.notified ?? 0) > 0 ||
      (result.failedConnectors ?? 0) > 0
    );
  }

  @OnWorkerEvent('active')
  onActive(job: Job): void {
    // Suppress periodic idle scan ticks from writing log entries before any action is confirmed
    if (this.isScheduledScan(job)) {
      return;
    }
    this.taskLogger.logActive(QUEUE_NAMES.RULES_EVALUATION, job);
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job, result: PipelineRunSummary): void {
    // Only write BullMQ logs if an action was actually taken
    if (this.isScheduledScan(job) && !this.hasAction(result)) {
      return;
    }
    this.taskLogger.logCompleted(QUEUE_NAMES.RULES_EVALUATION, job, result);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job | undefined, error: Error): void {
    this.taskLogger.logFailed(QUEUE_NAMES.RULES_EVALUATION, job, error);
  }
}
