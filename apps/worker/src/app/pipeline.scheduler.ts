import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { QUEUE_NAMES } from '@cairn/shared-constants';
import type { Queue } from 'bullmq';

const DAILY_PIPELINE_JOB_ID = 'daily-pipeline-run';
const DAILY_CRON_PATTERN = '0 3 * * *';

/**
 * Registers the one canonical repeatable job on boot via BullMQ's Job Scheduler API
 * (bullmq v5.7+) -- `upsertJobScheduler` is idempotent on `DAILY_PIPELINE_JOB_ID`, so a
 * service restart updates the existing schedule instead of adding a duplicate one.
 * See CAIRN_WORKER_ENGINEERING.md §2.
 */
@Injectable()
export class PipelineScheduler implements OnModuleInit {
  private readonly logger = new Logger(PipelineScheduler.name);

  constructor(
    @InjectQueue(QUEUE_NAMES.RULES_EVALUATION) private readonly queue: Queue,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.queue.upsertJobScheduler(
      DAILY_PIPELINE_JOB_ID,
      { pattern: DAILY_CRON_PATTERN },
      {
        name: 'daily-run',
        opts: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
          removeOnComplete: { age: 86400 },
          removeOnFail: false, // keep failed jobs around for the dead-letter view
        },
      },
    );
    this.logger.log(`Registered daily pipeline run (${DAILY_CRON_PATTERN})`);
  }
}
