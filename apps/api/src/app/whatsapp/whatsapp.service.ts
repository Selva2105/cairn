import { randomUUID } from 'node:crypto';

import { Injectable, Logger } from '@nestjs/common';
import {
  ManualEntryConnector,
  parseWhatsAppCommand,
} from '@cairn/connectors-manual-entry';
import { PrismaService } from '@cairn/database';
import { NotificationDispatchService } from '@cairn/notifications';
import { PipelineService } from '@cairn/pipeline';
import { NOTIFICATION_CHANNELS } from '@cairn/shared-constants';

export interface InboundMessage {
  from: string; // phone number, digits only, as Meta sends it (no leading '+')
  text: string;
}

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);
  private readonly connector = new ManualEntryConnector();

  constructor(
    private readonly prisma: PrismaService,
    private readonly pipeline: PipelineService,
    private readonly notifications: NotificationDispatchService,
  ) {}

  async handleInboundMessage(message: InboundMessage): Promise<void> {
    const phone = `+${message.from}`;
    const user = await this.prisma.user.findUnique({
      where: { phone },
      include: { memberships: true },
    });

    if (!user || user.memberships.length === 0) {
      this.logger.warn(
        `Inbound WhatsApp message from unregistered number ${phone}`,
      );
      return;
    }

    const command = parseWhatsAppCommand(message.text);
    if (!command) {
      await this.reply(
        phone,
        'Sorry, I didn\'t understand that. Try: "bill Electricity 1200 15-Oct" or "doc passport 2027-03-01".',
      );
      return;
    }

    const householdId = user.memberships[0]?.householdId;
    if (!householdId) {
      return;
    }

    const event = {
      ...this.connector.normalize({ externalId: randomUUID(), raw: command }),
      householdId,
    };

    const wasNew = await this.pipeline.recordManualEvent(householdId, event);
    await this.reply(
      phone,
      wasNew
        ? 'Got it -- added to your household digest.'
        : 'Already logged that one.',
    );
  }

  private async reply(to: string, body: string): Promise<void> {
    try {
      await this.notifications.dispatch(NOTIFICATION_CHANNELS.WHATSAPP, {
        to,
        subject: 'Cairn',
        body,
      });
    } catch (error) {
      // Best-effort -- a failed confirmation reply shouldn't surface as a webhook error to Meta.
      this.logger.error(
        'Failed to send WhatsApp confirmation reply',
        error as Error,
      );
    }
  }
}
