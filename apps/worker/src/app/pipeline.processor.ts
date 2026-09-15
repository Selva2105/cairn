import { Processor, WorkerHost } from '@nestjs/bullmq';
import { PipelineService, type PipelineRunSummary } from '@cairn/pipeline';
import { QUEUE_NAMES } from '@cairn/shared-constants';
import type { Job } from 'bullmq';

@Processor(QUEUE_NAMES.RULES_EVALUATION)
export class PipelineProcessor extends WorkerHost {
  constructor(private readonly pipeline: PipelineService) {
    super();
  }

  async process(
    job: Job<{ householdId?: string }>,
  ): Promise<PipelineRunSummary> {
    return this.pipeline.runOnce(job.data.householdId);
  }
}
