import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { AppConfigService } from '@cairn/shared-config';
import { PrismaService } from '@cairn/database';
import {
  ConnectorRegistryService,
  PipelineEventsService,
} from '@cairn/pipeline';
import type { DomainEvent } from '@cairn/domain';
import { ConnectorKey } from '@cairn/database';
import { google } from 'googleapis';

export interface ConnectorStatusItem {
  key: string;
  name: string;
  description: string;
  connected: boolean;
  enabled: boolean;
  accountEmail: string | null;
  lastRunAt: Date | null;
  authType: 'oauth' | 'webhook' | 'client';
}

interface ConnectorOAuthState {
  householdId: string;
  userId: string;
  connectorKey: 'GMAIL' | 'CALENDAR' | 'ALL';
  timestamp: number;
}

@Injectable()
export class ConnectorsService {
  private readonly logger = new Logger(ConnectorsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
    private readonly registry: ConnectorRegistryService,
    private readonly events: PipelineEventsService,
  ) {}

  private getCallbackUrl(): string {
    return this.config.get('GOOGLE_OAUTH_CALLBACK_URL');
  }

  async saveGoogleTokens(params: {
    householdId: string;
    connectorKey: 'GMAIL' | 'CALENDAR' | 'ALL';
    accessToken?: string | undefined;
    refreshToken?: string | undefined;
    email?: string | null | undefined;
  }): Promise<void> {
    const credentialsData: Record<string, unknown> = {
      accessToken: params.accessToken,
      email: params.email ?? null,
      clientId: this.config.get('GOOGLE_OAUTH_CLIENT_ID'),
      clientSecret: this.config.get('GOOGLE_OAUTH_CLIENT_SECRET'),
    };
    if (params.refreshToken) {
      credentialsData.refreshToken = params.refreshToken;
    }

    const keysToUpsert: ConnectorKey[] =
      params.connectorKey === 'ALL'
        ? [ConnectorKey.GMAIL, ConnectorKey.CALENDAR]
        : [params.connectorKey as ConnectorKey];

    for (const key of keysToUpsert) {
      const existing = await this.prisma.connectorConfig.findUnique({
        where: {
          householdId_key: {
            householdId: params.householdId,
            key,
          },
        },
      });

      const existingCreds =
        (existing?.credentials as Record<string, unknown>) ?? {};

      if (!credentialsData.refreshToken && existingCreds.refreshToken) {
        credentialsData.refreshToken = existingCreds.refreshToken;
      }

      await this.prisma.connectorConfig.upsert({
        where: {
          householdId_key: {
            householdId: params.householdId,
            key,
          },
        },
        create: {
          householdId: params.householdId,
          key,
          enabled: true,
          credentials: credentialsData as any,
        },
        update: {
          enabled: true,
          credentials: credentialsData as any,
          updatedAt: new Date(),
        },
      });
    }

    this.logger.log(
      `Saved Google ${params.connectorKey} credentials for household ${params.householdId} (${params.email})`,
    );
  }

  private createOAuth2Client() {
    return new google.auth.OAuth2(
      this.config.get('GOOGLE_OAUTH_CLIENT_ID'),
      this.config.get('GOOGLE_OAUTH_CLIENT_SECRET'),
      this.getCallbackUrl(),
    );
  }

  async listStatuses(householdId: string): Promise<ConnectorStatusItem[]> {
    const configs = await this.prisma.connectorConfig.findMany({
      where: { householdId },
    });

    const configMap = new Map(configs.map((c) => [c.key, c]));

    const gmailConfig = configMap.get(ConnectorKey.GMAIL);
    const gmailCreds =
      (gmailConfig?.credentials as Record<string, unknown>) ?? null;

    const calendarConfig = configMap.get(ConnectorKey.CALENDAR);
    const calCreds =
      (calendarConfig?.credentials as Record<string, unknown>) ?? null;

    const whatsappConfig = configMap.get(ConnectorKey.WHATSAPP);

    const hasServerWhatsApp = Boolean(
      this.config.get('WHATSAPP_PHONE_NUMBER_ID') &&
      this.config.get('WHATSAPP_ACCESS_TOKEN'),
    );

    return [
      {
        key: ConnectorKey.GMAIL,
        name: 'Google Gmail',
        description:
          'Scans your mailbox for incoming utility bills, invoices, and statements (matching label:bills or invoice keywords).',
        connected: Boolean(gmailCreds?.accessToken),
        enabled: gmailConfig?.enabled ?? false,
        accountEmail: (gmailCreds?.email as string) ?? null,
        lastRunAt: gmailConfig?.lastRunAt ?? null,
        authType: 'oauth',
      },
      {
        key: ConnectorKey.CALENDAR,
        name: 'Google Calendar',
        description:
          'Scans your primary calendar for maintenance tasks (HVAC, vehicle service, inspections, pest control) and syncs upcoming dates.',
        connected: Boolean(calCreds?.accessToken),
        enabled: calendarConfig?.enabled ?? false,
        accountEmail: (calCreds?.email as string) ?? null,
        lastRunAt: calendarConfig?.lastRunAt ?? null,
        authType: 'oauth',
      },
      {
        key: ConnectorKey.WHATSAPP,
        name: 'WhatsApp Assistant',
        description:
          'Interactive conversational assistant and single-line command entry for chores, bills, and document renewals.',
        connected: hasServerWhatsApp || (whatsappConfig?.enabled ?? false),
        enabled: whatsappConfig?.enabled ?? true,
        accountEmail: null,
        lastRunAt: whatsappConfig?.lastRunAt ?? null,
        authType: 'webhook',
      },
      {
        key: ConnectorKey.OCR,
        name: 'Receipt & Invoice OCR',
        description:
          'Client and server-side Tesseract.js optical character recognition engine for uploaded store receipts and paper bills.',
        connected: true,
        enabled: true,
        accountEmail: null,
        lastRunAt: null,
        authType: 'client',
      },
    ];
  }

  getGoogleAuthUrl(
    householdId: string,
    userId: string,
    connectorKey: 'GMAIL' | 'CALENDAR' | 'ALL' = 'GMAIL',
  ): string {
    const oauth2Client = this.createOAuth2Client();

    const scopes: string[] = ['https://www.googleapis.com/auth/userinfo.email'];

    if (connectorKey === 'GMAIL' || connectorKey === 'ALL') {
      scopes.push('https://www.googleapis.com/auth/gmail.readonly');
    }
    if (connectorKey === 'CALENDAR' || connectorKey === 'ALL') {
      scopes.push('https://www.googleapis.com/auth/calendar.readonly');
    }

    const statePayload: ConnectorOAuthState = {
      householdId,
      userId,
      connectorKey,
      timestamp: Date.now(),
    };

    const state = Buffer.from(JSON.stringify(statePayload)).toString(
      'base64url',
    );

    return oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: scopes,
      state,
    });
  }

  async handleGoogleCallback(
    code: string,
    stateString: string,
  ): Promise<{
    householdId: string;
    connectorKey: string;
    email: string | null;
  }> {
    let statePayload: ConnectorOAuthState;
    try {
      const decoded = Buffer.from(stateString, 'base64url').toString('utf-8');
      statePayload = JSON.parse(decoded);
    } catch {
      throw new BadRequestException('Invalid or expired OAuth state');
    }

    const oauth2Client = this.createOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    let email: string | null = null;
    try {
      const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
      const userinfo = await oauth2.userinfo.get();
      email = userinfo.data.email ?? null;
    } catch (e) {
      this.logger.warn('Could not fetch Google profile email', e as Error);
    }

    const credentialsData = {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiryDate: tokens.expiry_date,
      email,
      clientId: this.config.get('GOOGLE_OAUTH_CLIENT_ID'),
      clientSecret: this.config.get('GOOGLE_OAUTH_CLIENT_SECRET'),
      scope: tokens.scope,
    };

    const keysToUpsert: ConnectorKey[] =
      statePayload.connectorKey === 'ALL'
        ? [ConnectorKey.GMAIL, ConnectorKey.CALENDAR]
        : [statePayload.connectorKey as ConnectorKey];

    for (const key of keysToUpsert) {
      await this.prisma.connectorConfig.upsert({
        where: {
          householdId_key: {
            householdId: statePayload.householdId,
            key,
          },
        },
        create: {
          householdId: statePayload.householdId,
          key,
          enabled: true,
          credentials: credentialsData,
        },
        update: {
          enabled: true,
          credentials: credentialsData,
          updatedAt: new Date(),
        },
      });
    }

    this.logger.log(
      `Successfully connected Google ${statePayload.connectorKey} for household ${statePayload.householdId} (${email})`,
    );

    return {
      householdId: statePayload.householdId,
      connectorKey: statePayload.connectorKey,
      email,
    };
  }

  async toggle(
    householdId: string,
    key: ConnectorKey,
    enabled: boolean,
  ): Promise<void> {
    const existing = await this.prisma.connectorConfig.findUnique({
      where: {
        householdId_key: { householdId, key },
      },
    });

    if (!existing) {
      await this.prisma.connectorConfig.create({
        data: {
          householdId,
          key,
          enabled,
        },
      });
      return;
    }

    await this.prisma.connectorConfig.update({
      where: {
        householdId_key: { householdId, key },
      },
      data: { enabled },
    });
  }

  async disconnect(householdId: string, key: ConnectorKey): Promise<void> {
    await this.prisma.connectorConfig.deleteMany({
      where: { householdId, key },
    });
  }

  async sync(
    householdId: string,
    key: 'GMAIL' | 'CALENDAR',
  ): Promise<{
    key: string;
    ingested: number;
    skipped: number;
    totalSignals: number;
  }> {
    const enabledConnector = await this.registry.getSingleConnector(
      householdId,
      key,
    );

    if (!enabledConnector) {
      throw new NotFoundException(
        `Connector ${key} is not connected or enabled for this household.`,
      );
    }

    const { connector, context } = enabledConnector;
    const rawSignals = await connector.fetch(context);

    let ingested = 0;
    let skipped = 0;

    for (const raw of rawSignals) {
      const event: DomainEvent = {
        ...connector.normalize(raw),
        householdId,
      };
      const wasNew = await this.events.persistIfNew(householdId, event);
      if (wasNew) {
        ingested++;
      } else {
        skipped++;
      }
    }

    await this.prisma.connectorConfig.updateMany({
      where: { householdId, key: key as ConnectorKey },
      data: { lastRunAt: new Date() },
    });

    return {
      key,
      ingested,
      skipped,
      totalSignals: rawSignals.length,
    };
  }
}
