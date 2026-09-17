import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { QUEUE_NAMES } from '@cairn/shared-constants';
import type { Queue } from 'bullmq';

import { BullmqTaskLogger } from './bullmq-task-logger.service';

const PIPELINE_JOB_ID = 'pipeline-scheduled-scan';
// Runs every minute so document expirations, bill due dates, and reminders trigger promptly
// at the exact time of expiry, while EventLog deduplication prevents duplicate notifications.
const PIPELINE_CRON_PATTERN = '* * * * *';

/**
 * Registers the scheduled pipeline scan job on boot via BullMQ's Job Scheduler API
 * (bullmq v5.7+) -- `upsertJobScheduler` is idempotent on `PIPELINE_JOB_ID`.
 */
@Injectable()
export class PipelineScheduler implements OnModuleInit {
  private readonly logger = new Logger(PipelineScheduler.name);

  constructor(
    @InjectQueue(QUEUE_NAMES.RULES_EVALUATION) private readonly queue: Queue,
    private readonly taskLogger: BullmqTaskLogger,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.queue.upsertJobScheduler(
      PIPELINE_JOB_ID,
      { pattern: PIPELINE_CRON_PATTERN },
      {
        name: 'scheduled-pipeline-run',
        opts: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
          removeOnComplete: { age: 86400 },
          removeOnFail: false,
        },
      },
    );
    this.logger.log(
      `[${this.taskLogger.formatTime()}] 🕒 SCHEDULER | Registered pipeline scan (${PIPELINE_CRON_PATTERN})`,
    );
  }
}
