import { Module } from '@nestjs/common';

import { EmailChannel } from './email.channel';
import { NotificationDispatchService } from './notification-dispatch.service';

@Module({
  providers: [EmailChannel, NotificationDispatchService],
  exports: [NotificationDispatchService],
})
export class CairnNotificationsModule {}
