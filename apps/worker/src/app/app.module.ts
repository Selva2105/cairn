import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { CairnPipelineModule } from '@cairn/pipeline';
import {
  CairnNotificationsModule,
  NotificationDispatchService,
} from '@cairn/notifications';
import { PrismaModule } from '@cairn/database';
import { AppConfigModule, AppConfigService } from '@cairn/shared-config';
import { QUEUE_NAMES } from '@cairn/shared-constants';
import Redis from 'ioredis';

import { BullmqTaskLogger } from './bullmq-task-logger.service';
import { NotificationDispatchProcessor } from './notification.processor';
import { PipelineProcessor } from './pipeline.processor';
import { PipelineScheduler } from './pipeline.scheduler';
import { QueuedNotificationDispatchService } from './queued-notification-dispatch.service';

@Module({
  imports: [
    AppConfigModule,
    PrismaModule,
    CairnNotificationsModule,
    BullModule.forRootAsync({
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => ({
        // BullMQ requires maxRetriesPerRequest: null for its blocking commands.
        connection: new Redis(config.get('REDIS_URL'), {
          maxRetriesPerRequest: null,
        }),
      }),
    }),
    BullModule.registerQueue(
      { name: QUEUE_NAMES.RULES_EVALUATION },
      { name: QUEUE_NAMES.NOTIFICATION_DISPATCH },
    ),
    CairnPipelineModule,
  ],
  providers: [
    BullmqTaskLogger,
    PipelineProcessor,
    PipelineScheduler,
    NotificationDispatchProcessor,
    QueuedNotificationDispatchService,
    {
      provide: NotificationDispatchService,
      useExisting: QueuedNotificationDispatchService,
    },
  ],
})
export class AppModule {}
