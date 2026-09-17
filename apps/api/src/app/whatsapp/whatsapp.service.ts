import { randomUUID } from 'node:crypto';

import { Injectable, Logger } from '@nestjs/common';
import {
  ManualEntryConnector,
  parseWhatsAppCommand,
} from '@cairn/connectors-manual-entry';
import { PrismaService, TaskPriority } from '@cairn/database';
import { NotificationDispatchService } from '@cairn/notifications';
import { PipelineService } from '@cairn/pipeline';
import { EVENT_TYPES, NOTIFICATION_CHANNELS } from '@cairn/shared-constants';

import { HouseholdConfigService } from '../config/household-config.service';

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
    private readonly configService: HouseholdConfigService,
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
        'Sorry, I didn\'t understand that. Try: "bill Electricity 1200 15-Oct", "task Fix leaking pipe", or "doc passport 2027-03-01".',
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

    const config = await this.configService.getOrCreateConfig(householdId);
    const priority =
      (config.defaultTaskPriority as TaskPriority) ?? TaskPriority.MEDIUM;

    const wasNew = await this.pipeline.recordManualEvent(householdId, event);

    if (wasNew) {
      if (command.type === EVENT_TYPES.BILL_DETECTED) {
        const payload = command.payload as {
          vendor: string;
          amount: number;
          dueDate: string;
          currency?: string;
        };
        const currency = payload.currency ?? config.currency;
        const symbol =
          config.currencySymbol || (currency === 'INR' ? '₹' : '$');

        // Auto-create bill record
        await this.prisma.bill
          .create({
            data: {
              householdId,
              vendor: payload.vendor,
              amount: payload.amount,
              currency,
              dueDate: new Date(payload.dueDate),
            },
          })
          .catch((err) => this.logger.error('Failed to create Bill', err));

        // Auto-create Task for the household tasks board
        await this.prisma.task
          .create({
            data: {
              householdId,
              description: `Pay ${payload.vendor} bill (${symbol}${payload.amount})`,
              dueOn: new Date(payload.dueDate),
              status: 'OPEN',
              priority,
            },
          })
          .catch((err) => this.logger.error('Failed to create Task', err));
      } else if (command.type === EVENT_TYPES.TASK_EXTRACTED) {
        const payload = command.payload as { description: string };
        await this.prisma.task
          .create({
            data: {
              householdId,
              description: payload.description,
              status: 'OPEN',
              priority,
            },
          })
          .catch((err) => this.logger.error('Failed to create Task', err));
      } else if (command.type === EVENT_TYPES.DOCUMENT_EXPIRING) {
        const payload = command.payload as {
          documentType: string;
          expiresOn: string;
        };

        const raw = payload.documentType
          .trim()
          .toUpperCase()
          .replace(/\s+/g, '_');
        const matchedType =
          config.documentTypes.find(
            (t) => t === raw || t.includes(raw) || raw.includes(t),
          ) ?? raw;

        if (!config.documentTypes.includes(matchedType)) {
          await this.configService.addDocumentType(householdId, matchedType);
        }

        await this.prisma.document
          .create({
            data: {
              householdId,
              type: matchedType,
              label: payload.documentType,
              expiresOn: new Date(payload.expiresOn),
            },
          })
          .catch((err) => this.logger.error('Failed to create Document', err));

        await this.prisma.task
          .create({
            data: {
              householdId,
              description: `Renew ${payload.documentType} before expiration`,
              dueOn: new Date(payload.expiresOn),
              status: 'OPEN',
              priority,
            },
          })
          .catch((err) => this.logger.error('Failed to create Task', err));
      }
    }

    await this.reply(
      phone,
      wasNew
        ? 'Got it -- added to your household tasks & digest.'
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
