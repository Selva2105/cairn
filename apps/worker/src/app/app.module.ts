import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { CairnPipelineModule } from '@cairn/pipeline';
import { PrismaModule } from '@cairn/database';
import { AppConfigModule, AppConfigService } from '@cairn/shared-config';
import { QUEUE_NAMES } from '@cairn/shared-constants';
import Redis from 'ioredis';

import { PipelineProcessor } from './pipeline.processor';
import { PipelineScheduler } from './pipeline.scheduler';

@Module({
  imports: [
    AppConfigModule,
    PrismaModule,
    BullModule.forRootAsync({
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => ({
        // BullMQ requires maxRetriesPerRequest: null for its blocking commands.
        connection: new Redis(config.get('REDIS_URL'), {
          maxRetriesPerRequest: null,
        }),
      }),
    }),
    BullModule.registerQueue({ name: QUEUE_NAMES.RULES_EVALUATION }),
    CairnPipelineModule,
  ],
  providers: [PipelineProcessor, PipelineScheduler],
})
export class AppModule {}
