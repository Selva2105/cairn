import { Module } from '@nestjs/common';

import { EmailChannel } from './email.channel';
import { NotificationDispatchService } from './notification-dispatch.service';
import { WhatsAppChannel } from './whatsapp.channel';

@Module({
  providers: [EmailChannel, WhatsAppChannel, NotificationDispatchService],
  exports: [EmailChannel, WhatsAppChannel, NotificationDispatchService],
})
export class CairnNotificationsModule {}
