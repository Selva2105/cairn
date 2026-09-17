import { randomUUID } from 'node:crypto';

import { Injectable, Logger } from '@nestjs/common';
import {
  ManualEntryConnector,
  parseWhatsAppCommand,
} from '@cairn/connectors-manual-entry';
import { PrismaService, TaskPriority } from '@cairn/database';
import type { InteractivePayload } from '@cairn/notifications';
import { NotificationDispatchService } from '@cairn/notifications';
import { PipelineService } from '@cairn/pipeline';
import { EVENT_TYPES, NOTIFICATION_CHANNELS } from '@cairn/shared-constants';

import { HouseholdConfigService } from '../config/household-config.service';

export interface InboundMessage {
  from: string;
  text: string;
  buttonId?: string;
}

export interface SimulationResult {
  replyText: string;
  interactive?: InteractivePayload;
  createdEntities?: {
    bill?: { id: string; vendor: string; amount: number; dueDate: string };
    task?: { id: string; description: string; dueOn?: string };
    document?: { id: string; label: string; expiresOn: string };
  };
}

interface BillWizardData {
  vendor?: string;
  amount?: number;
  dueDate?: Date;
}

interface TaskWizardData {
  description?: string;
  dueOn?: Date;
}

type WizardState =
  | {
      flow: 'ADD_BILL';
      step:
        'WAITING_FOR_VENDOR' | 'WAITING_FOR_AMOUNT' | 'WAITING_FOR_DUE_DATE';
      data: BillWizardData;
    }
  | {
      flow: 'ADD_TASK';
      step: 'WAITING_FOR_DESC' | 'WAITING_FOR_DUE_DATE';
      data: TaskWizardData;
    };

interface UserSession {
  state: WizardState;
  lastActiveAt: number;
}

const SESSION_TTL_MS = 10 * 60 * 1000; // 10 minutes

export const MAIN_MENU_INTERACTIVE: InteractivePayload = {
  type: 'button',
  buttons: [
    { id: 'ACTION_ADD_BILL', title: '💸 Add Bill' },
    { id: 'ACTION_ADD_TASK', title: '✅ Add Task' },
    { id: 'ACTION_STATUS', title: '📊 Status' },
  ],
};

const BILL_DUE_INTERACTIVE: InteractivePayload = {
  type: 'button',
  buttons: [
    { id: 'DUE_TODAY', title: 'Due Today' },
    { id: 'DUE_TOMORROW', title: 'Due Tomorrow' },
    { id: 'DUE_NEXT_WEEK', title: 'In 7 Days' },
  ],
};

const TASK_DUE_INTERACTIVE: InteractivePayload = {
  type: 'button',
  buttons: [
    { id: 'TASK_TODAY', title: 'Due Today' },
    { id: 'TASK_TOMORROW', title: 'Due Tomorrow' },
    { id: 'TASK_NO_DUE', title: 'No Due Date' },
  ],
};

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);
  private readonly connector = new ManualEntryConnector();
  private readonly sessions = new Map<string, UserSession>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly pipeline: PipelineService,
    private readonly notifications: NotificationDispatchService,
    private readonly configService: HouseholdConfigService,
  ) {}

  async handleInboundMessage(message: InboundMessage): Promise<void> {
    const rawPhone = message.from.trim();
    const phone = rawPhone.startsWith('+') ? rawPhone : `+${rawPhone}`;

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

    const householdId = user.memberships[0]?.householdId;
    if (!householdId) {
      return;
    }

    const result = await this.processMessage(
      householdId,
      phone,
      user.name,
      message.text,
      message.buttonId,
    );

    await this.reply(phone, result.replyText, result.interactive);
  }

  async simulate(
    householdId: string,
    text: string,
    buttonId?: string,
  ): Promise<SimulationResult> {
    const members = await this.prisma.householdMember.findMany({
      where: { householdId },
      include: { user: true },
    });

    const user = members[0]?.user;
    const phone = user?.phone ?? `simulated-${householdId}`;
    const userName = user?.name ?? 'Household Member';

    return this.processMessage(householdId, phone, userName, text, buttonId);
  }

  private async processMessage(
    householdId: string,
    sessionKey: string,
    userName: string | null | undefined,
    rawText: string,
    buttonId?: string,
  ): Promise<SimulationResult> {
    this.cleanExpiredSessions();

    const text = rawText.trim();
    const lowerText = text.toLowerCase();

    // 1. Cancellation check
    if (lowerText === 'cancel' || lowerText === 'exit') {
      this.sessions.delete(sessionKey);
      return {
        replyText:
          '❌ Conversation cancelled. What else can I assist your household with?',
        interactive: MAIN_MENU_INTERACTIVE,
      };
    }

    // 2. Main menu button click
    if (buttonId === 'ACTION_MENU') {
      this.sessions.delete(sessionKey);
      return {
        replyText: `👋 *Hi ${userName ?? 'there'}!* Welcome to Cairn.\n\nChoose an action below to get started:`,
        interactive: MAIN_MENU_INTERACTIVE,
      };
    }

    // 3. Active conversation wizard handling
    const activeSession = this.sessions.get(sessionKey);
    if (activeSession) {
      return this.handleActiveSession(
        householdId,
        sessionKey,
        activeSession,
        text,
        buttonId,
      );
    }

    // 4. Button-driven starts (when no active wizard)
    if (buttonId === 'ACTION_ADD_BILL') {
      this.sessions.set(sessionKey, {
        state: {
          flow: 'ADD_BILL',
          step: 'WAITING_FOR_VENDOR',
          data: {},
        },
        lastActiveAt: Date.now(),
      });
      return {
        replyText:
          '💸 *Add a Household Bill* (Step 1/3)\n\nWhat is the bill or vendor name? (e.g. Wifi, Rent, Electricity, Water)',
      };
    }

    if (buttonId === 'ACTION_ADD_TASK') {
      this.sessions.set(sessionKey, {
        state: {
          flow: 'ADD_TASK',
          step: 'WAITING_FOR_DESC',
          data: {},
        },
        lastActiveAt: Date.now(),
      });
      return {
        replyText:
          '✅ *Add a Household Chore* (Step 1/2)\n\nWhat is the task or chore? (e.g. Call plumber, Buy groceries, Clean filters)',
      };
    }

    if (buttonId === 'ACTION_STATUS') {
      return this.generateHouseholdStatusReport(householdId);
    }

    // 5. Direct 1-line syntax bypass (e.g. "bill Electricity 1200 15-Oct", "task Groceries")
    const command = parseWhatsAppCommand(text);
    if (command) {
      return this.handleDirectCommand(householdId, command);
    }

    // 6. Unrecognized text / greeting ("hi", "hello", "help", etc.)
    return {
      replyText: `👋 *Hi ${userName ?? 'there'}!* Welcome to Cairn Assistant.\n\nI can help manage your household tasks, upcoming bills, and document renewals.\n\nChoose an action below to get started:`,
      interactive: MAIN_MENU_INTERACTIVE,
    };
  }

  private async handleActiveSession(
    householdId: string,
    sessionKey: string,
    session: UserSession,
    text: string,
    buttonId?: string,
  ): Promise<SimulationResult> {
    if (session.state.flow === 'ADD_BILL') {
      if (session.state.step === 'WAITING_FOR_VENDOR') {
        session.state.data.vendor = text;
        session.state.step = 'WAITING_FOR_AMOUNT';
        session.lastActiveAt = Date.now();
        return {
          replyText: `💸 *Add Bill* (Step 2/3)\nVendor: *${text}*\n\nHow much is this bill in ₹? (e.g. 500, 1200, 25000)`,
        };
      }

      if (session.state.step === 'WAITING_FOR_AMOUNT') {
        const amount = parseAmount(text);
        if (!amount) {
          return {
            replyText:
              '⚠️ Please enter a valid positive number for the amount (e.g. 500, 1200):',
          };
        }
        session.state.data.amount = amount;
        session.state.step = 'WAITING_FOR_DUE_DATE';
        session.lastActiveAt = Date.now();
        return {
          replyText: `💸 *Add Bill* (Step 3/3)\nVendor: *${session.state.data.vendor}*\nAmount: *₹${amount.toLocaleString('en-IN')}*\n\nWhen is this bill due? Choose an option below or type a date:`,
          interactive: BILL_DUE_INTERACTIVE,
        };
      }

      if (session.state.step === 'WAITING_FOR_DUE_DATE') {
        const dueDate = resolveDueDate(buttonId, text);
        if (!dueDate) {
          return {
            replyText:
              "⚠️ Could not understand date. Please choose a button below or type a date like 'tomorrow', '25-Oct', or '2026-10-25':",
            interactive: BILL_DUE_INTERACTIVE,
          };
        }

        const vendor = session.state.data.vendor ?? 'Household Bill';
        const amount = session.state.data.amount ?? 0;
        this.sessions.delete(sessionKey);

        const config = await this.configService.getOrCreateConfig(householdId);
        const priority =
          (config.defaultTaskPriority as TaskPriority) ?? TaskPriority.MEDIUM;

        const bill = await this.prisma.bill.create({
          data: {
            householdId,
            vendor,
            amount,
            currency: 'INR',
            dueDate,
          },
        });

        const task = await this.prisma.task.create({
          data: {
            householdId,
            description: `Pay ${vendor} bill (₹${amount.toLocaleString('en-IN')})`,
            dueOn: dueDate,
            status: 'OPEN',
            priority,
          },
        });

        const event = {
          ...this.connector.normalize({
            externalId: randomUUID(),
            raw: {
              type: EVENT_TYPES.BILL_DETECTED,
              payload: {
                vendor,
                amount,
                currency: 'INR',
                dueDate: dueDate.toISOString(),
                isRecurring: false,
              },
            },
          }),
          householdId,
        };
        await this.pipeline.recordManualEvent(householdId, event);

        return {
          replyText: `✅ Added *${vendor}* bill (*₹${amount.toLocaleString('en-IN')}*) due on *${formatDisplayDate(dueDate)}* to your household tasks & bills!`,
          interactive: MAIN_MENU_INTERACTIVE,
          createdEntities: {
            bill: {
              id: bill.id,
              vendor: bill.vendor,
              amount: Number(bill.amount),
              dueDate: bill.dueDate.toISOString(),
            },
            task: {
              id: task.id,
              description: task.description,
              ...(task.dueOn ? { dueOn: task.dueOn.toISOString() } : {}),
            },
          },
        };
      }
    }

    if (session.state.flow === 'ADD_TASK') {
      if (session.state.step === 'WAITING_FOR_DESC') {
        session.state.data.description = text;
        session.state.step = 'WAITING_FOR_DUE_DATE';
        session.lastActiveAt = Date.now();
        return {
          replyText: `✅ *Add Chore* (Step 2/2)\nChore: *${text}*\n\nWhen should this chore be completed?`,
          interactive: TASK_DUE_INTERACTIVE,
        };
      }

      if (session.state.step === 'WAITING_FOR_DUE_DATE') {
        const dueOn = resolveTaskDueDate(buttonId, text);
        const description = session.state.data.description ?? 'Household Task';
        this.sessions.delete(sessionKey);

        const config = await this.configService.getOrCreateConfig(householdId);
        const priority =
          (config.defaultTaskPriority as TaskPriority) ?? TaskPriority.MEDIUM;

        const task = await this.prisma.task.create({
          data: {
            householdId,
            description,
            ...(dueOn ? { dueOn } : {}),
            status: 'OPEN',
            priority,
          },
        });

        const event = {
          ...this.connector.normalize({
            externalId: randomUUID(),
            raw: {
              type: EVENT_TYPES.TASK_EXTRACTED,
              payload: { description },
            },
          }),
          householdId,
        };
        await this.pipeline.recordManualEvent(householdId, event);

        return {
          replyText: `✅ Added chore: *${description}*${dueOn ? ` (due *${formatDisplayDate(dueOn)}*)` : ''} to your household board!`,
          interactive: MAIN_MENU_INTERACTIVE,
          createdEntities: {
            task: {
              id: task.id,
              description: task.description,
              ...(task.dueOn ? { dueOn: task.dueOn.toISOString() } : {}),
            },
          },
        };
      }
    }

    this.sessions.delete(sessionKey);
    return {
      replyText: 'Session reset. What would you like to do next?',
      interactive: MAIN_MENU_INTERACTIVE,
    };
  }

  private async generateHouseholdStatusReport(
    householdId: string,
  ): Promise<SimulationResult> {
    const now = new Date();
    const in7Days = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const in30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const [openTasks, upcomingBills, expiringDocs] = await Promise.all([
      this.prisma.task.findMany({
        where: { householdId, status: 'OPEN' },
        orderBy: { dueOn: 'asc' },
        take: 3,
      }),
      this.prisma.bill.findMany({
        where: {
          householdId,
          dueDate: { gte: now, lte: in7Days },
        },
        orderBy: { dueDate: 'asc' },
        take: 3,
      }),
      this.prisma.document.findMany({
        where: {
          householdId,
          expiresOn: { gte: now, lte: in30Days },
        },
        orderBy: { expiresOn: 'asc' },
        take: 3,
      }),
    ]);

    const taskCount = await this.prisma.task.count({
      where: { householdId, status: 'OPEN' },
    });

    const lines: string[] = ['📊 *Household Operations Summary*'];

    lines.push(`\n✅ *Open Tasks (${taskCount})*:`);
    if (openTasks.length === 0) {
      lines.push('  • No pending chores! All caught up.');
    } else {
      for (const t of openTasks) {
        const dueStr = t.dueOn ? ` (due ${formatDisplayDate(t.dueOn)})` : '';
        lines.push(`  • ${t.description}${dueStr}`);
      }
    }

    lines.push('\n💸 *Bills Due in 7 Days*:');
    if (upcomingBills.length === 0) {
      lines.push('  • No bills due this week.');
    } else {
      for (const b of upcomingBills) {
        lines.push(
          `  • ${b.vendor}: ₹${Number(b.amount).toLocaleString('en-IN')} (due ${formatDisplayDate(b.dueDate)})`,
        );
      }
    }

    lines.push('\n📑 *Expiring Documents (30d)*:');
    if (expiringDocs.length === 0) {
      lines.push('  • All documents up to date.');
    } else {
      for (const d of expiringDocs) {
        const daysLeft = Math.ceil(
          (d.expiresOn.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
        );
        lines.push(`  • ${d.label} (expires in ${daysLeft}d)`);
      }
    }

    lines.push('\nChoose an action below:');

    return {
      replyText: lines.join('\n'),
      interactive: MAIN_MENU_INTERACTIVE,
    };
  }

  private async handleDirectCommand(
    householdId: string,
    command: ReturnType<typeof parseWhatsAppCommand>,
  ): Promise<SimulationResult> {
    if (!command) {
      return {
        replyText: 'Sorry, could not process command.',
        interactive: MAIN_MENU_INTERACTIVE,
      };
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
          currency: string;
          dueDate: string;
        };

        const dueDate = new Date(payload.dueDate);
        const bill = await this.prisma.bill.create({
          data: {
            householdId,
            vendor: payload.vendor,
            amount: payload.amount,
            currency: payload.currency ?? 'INR',
            dueDate,
          },
        });

        const task = await this.prisma.task.create({
          data: {
            householdId,
            description: `Pay ${payload.vendor} bill (₹${payload.amount.toLocaleString('en-IN')})`,
            dueOn: dueDate,
            status: 'OPEN',
            priority,
          },
        });

        return {
          replyText: `✅ Added *${payload.vendor}* bill (*₹${payload.amount.toLocaleString('en-IN')}*) due on *${formatDisplayDate(dueDate)}* to your household tasks & digest.`,
          interactive: MAIN_MENU_INTERACTIVE,
          createdEntities: {
            bill: {
              id: bill.id,
              vendor: bill.vendor,
              amount: Number(bill.amount),
              dueDate: bill.dueDate.toISOString(),
            },
            task: {
              id: task.id,
              description: task.description,
              ...(task.dueOn ? { dueOn: task.dueOn.toISOString() } : {}),
            },
          },
        };
      }

      if (command.type === EVENT_TYPES.TASK_EXTRACTED) {
        const payload = command.payload as { description: string };
        const task = await this.prisma.task.create({
          data: {
            householdId,
            description: payload.description,
            status: 'OPEN',
            priority,
          },
        });

        return {
          replyText: `✅ Added chore: *${payload.description}* to your household tasks.`,
          interactive: MAIN_MENU_INTERACTIVE,
          createdEntities: {
            task: {
              id: task.id,
              description: task.description,
              ...(task.dueOn ? { dueOn: task.dueOn.toISOString() } : {}),
            },
          },
        };
      }

      if (command.type === EVENT_TYPES.DOCUMENT_EXPIRING) {
        const payload = command.payload as {
          documentType: string;
          expiresOn: string;
        };
        const raw = payload.documentType.trim().toUpperCase();
        const matchedType =
          config.documentTypes.find(
            (t) => t === raw || t.includes(raw) || raw.includes(t),
          ) ?? raw;

        if (!config.documentTypes.includes(matchedType)) {
          await this.configService.addDocumentType(householdId, matchedType);
        }

        const expiresOn = new Date(payload.expiresOn);
        const doc = await this.prisma.document.create({
          data: {
            householdId,
            type: matchedType,
            label: payload.documentType,
            expiresOn,
          },
        });

        const task = await this.prisma.task.create({
          data: {
            householdId,
            description: `Renew ${payload.documentType} before expiration`,
            dueOn: expiresOn,
            status: 'OPEN',
            priority,
          },
        });

        return {
          replyText: `✅ Added document: *${payload.documentType}* (expires *${formatDisplayDate(expiresOn)}*) with renewal task.`,
          interactive: MAIN_MENU_INTERACTIVE,
          createdEntities: {
            document: {
              id: doc.id,
              label: doc.label,
              expiresOn: doc.expiresOn.toISOString(),
            },
            task: {
              id: task.id,
              description: task.description,
              ...(task.dueOn ? { dueOn: task.dueOn.toISOString() } : {}),
            },
          },
        };
      }
    }

    return {
      replyText: wasNew
        ? 'Got it -- added to your household tasks & digest.'
        : 'Already logged that one.',
      interactive: MAIN_MENU_INTERACTIVE,
    };
  }

  private cleanExpiredSessions(): void {
    const now = Date.now();
    for (const [key, session] of this.sessions.entries()) {
      if (now - session.lastActiveAt > SESSION_TTL_MS) {
        this.sessions.delete(key);
      }
    }
  }

  private async reply(
    to: string,
    body: string,
    interactive?: InteractivePayload,
  ): Promise<void> {
    try {
      await this.notifications.dispatch(NOTIFICATION_CHANNELS.WHATSAPP, {
        to,
        subject: 'Cairn',
        body,
        ...(interactive ? { interactive } : {}),
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

function parseAmount(text: string): number | null {
  const cleaned = text.replace(/[^0-9.]/g, '');
  const val = parseFloat(cleaned);
  return Number.isNaN(val) || val <= 0 ? null : val;
}

function resolveDueDate(
  buttonId: string | undefined,
  text: string,
): Date | null {
  if (buttonId === 'DUE_TODAY' || text.trim().toLowerCase() === 'today') {
    return new Date();
  }
  if (buttonId === 'DUE_TOMORROW' || text.trim().toLowerCase() === 'tomorrow') {
    return new Date(Date.now() + 24 * 60 * 60 * 1000);
  }
  if (
    buttonId === 'DUE_NEXT_WEEK' ||
    text.trim().toLowerCase().includes('next week') ||
    text.trim().toLowerCase() === 'in 7 days'
  ) {
    return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  }
  const direct = new Date(text.trim());
  if (!Number.isNaN(direct.getTime())) {
    return direct;
  }
  const withYear = new Date(`${text.trim()}-${new Date().getFullYear()}`);
  return Number.isNaN(withYear.getTime()) ? null : withYear;
}

function resolveTaskDueDate(
  buttonId: string | undefined,
  text: string,
): Date | undefined {
  if (
    buttonId === 'TASK_NO_DUE' ||
    text.trim().toLowerCase() === 'no due date' ||
    text.trim().toLowerCase() === 'none'
  ) {
    return undefined;
  }
  const date = resolveDueDate(buttonId, text);
  return date ?? undefined;
}

function formatDisplayDate(date: Date): string {
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
