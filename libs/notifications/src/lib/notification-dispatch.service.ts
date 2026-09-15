import { Injectable } from '@nestjs/common';
import { NOTIFICATION_CHANNELS } from '@cairn/shared-constants';

import { EmailChannel } from './email.channel';
import type {
  NotificationChannel,
  NotificationPayload,
} from './notification-channel.interface';
import { WhatsAppChannel } from './whatsapp.channel';

@Injectable()
export class NotificationDispatchService {
  private readonly channels: Record<string, NotificationChannel>;

  constructor(emailChannel: EmailChannel, whatsAppChannel: WhatsAppChannel) {
    this.channels = {
      [NOTIFICATION_CHANNELS.EMAIL]: emailChannel,
      [NOTIFICATION_CHANNELS.WHATSAPP]: whatsAppChannel,
    };
  }

  async dispatch(
    channelKey: string,
    payload: NotificationPayload,
  ): Promise<void> {
    const channel = this.channels[channelKey];
    if (!channel) {
      throw new Error(`Unknown notification channel: ${channelKey}`);
    }
    await channel.send(payload);
  }
}
