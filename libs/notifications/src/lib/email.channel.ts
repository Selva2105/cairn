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
    const user = this.config.get('SMTP_USER');
    const password = this.config.get('SMTP_PASSWORD');

    this.transporter = createTransport({
      host: this.config.get('SMTP_HOST'),
      port: this.config.get('SMTP_PORT'),
      // mailpit locally takes no auth; Brevo (and most real relays) require it -- only send
      // credentials when they're actually configured.
      secure: false,
      ...(user && password ? { auth: { user, pass: password } } : {}),
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
