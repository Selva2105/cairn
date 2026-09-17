import { Injectable, Logger } from '@nestjs/common';
import { AppConfigService } from '@cairn/shared-config';

import type {
  NotificationChannel,
  NotificationPayload,
} from './notification-channel.interface';
import {
  buildWhatsAppMessagePayload,
  stripHtml,
} from './whatsapp-payload.builder';

const GRAPH_API_VERSION = 'v21.0';

@Injectable()
export class WhatsAppChannel implements NotificationChannel {
  readonly key = 'whatsapp';
  private readonly logger = new Logger(WhatsAppChannel.name);
  private readonly config: AppConfigService;

  constructor(config: AppConfigService) {
    this.config = config;
  }

  async send(payload: NotificationPayload): Promise<void> {
    const phoneNumberId =
      this.config.get('WHATSAPP_PHONE_NUMBER_ID') ||
      process.env['WHATSAPP_PHONE_NUMBER_ID'];
    const accessToken =
      this.config.get('WHATSAPP_ACCESS_TOKEN') ||
      process.env['WHATSAPP_ACCESS_TOKEN'];
    if (!phoneNumberId || !accessToken) {
      throw new Error(
        'WhatsApp channel requires WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_ACCESS_TOKEN',
      );
    }

    const formattedBody =
      payload.body.trim().startsWith(payload.subject) ||
      payload.body.trim().startsWith(`*${payload.subject}`) ||
      !payload.subject
        ? stripHtml(payload.body).trim()
        : `${payload.subject}\n\n${stripHtml(payload.body).trim()}`;

    const requestBody = buildWhatsAppMessagePayload(payload, formattedBody);

    const response = await fetch(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      },
    );

    if (!response.ok) {
      const body = await response.text();
      this.logger.error(`WhatsApp send failed (${response.status}): ${body}`);
      throw new Error(
        `WhatsApp Cloud API request failed with status ${response.status}`,
      );
    }
  }
}
