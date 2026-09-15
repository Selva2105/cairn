import { Injectable, OnModuleInit } from '@nestjs/common';
import { AppConfigService } from '@cairn/shared-config';
import { createTransport, type Transporter } from 'nodemailer';

import type {
  NotificationChannel,
  NotificationPayload,
} from './notification-channel.interface';

@Injectable()
export class EmailChannel implements NotificationChannel, OnModuleInit {
  readonly key = 'email';
  private transporter!: Transporter;

  constructor(private readonly config: AppConfigService) {}

  onModuleInit(): void {
    this.transporter = createTransport({
      host: this.config.get('SMTP_HOST'),
      port: this.config.get('SMTP_PORT'),
      secure: false,
    });
  }

  async send(payload: NotificationPayload): Promise<void> {
    await this.transporter.sendMail({
      from: 'Cairn <noreply@cairn.local>',
      to: payload.to,
      subject: payload.subject,
      html: payload.body,
    });
  }
}
