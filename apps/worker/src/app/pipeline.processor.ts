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

  @OnWorkerEvent('active')
  onActive(job: Job): void {
    this.taskLogger.logActive(QUEUE_NAMES.RULES_EVALUATION, job);
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job, result: PipelineRunSummary): void {
    this.taskLogger.logCompleted(QUEUE_NAMES.RULES_EVALUATION, job, result);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job | undefined, error: Error): void {
    this.taskLogger.logFailed(QUEUE_NAMES.RULES_EVALUATION, job, error);
  }
}
