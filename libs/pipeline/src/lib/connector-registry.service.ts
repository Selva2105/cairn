import { Injectable } from '@nestjs/common';
import type { Connector, ConnectorContext } from '@cairn/domain';
import { CalendarConnector } from '@cairn/connectors-calendar';
import { GmailConnector } from '@cairn/connectors-gmail';
import { PrismaService } from '@cairn/database';

const CONNECTOR_FACTORIES: Record<string, () => Connector> = {
  GMAIL: () => new GmailConnector(),
  CALENDAR: () => new CalendarConnector(),
};

export interface EnabledConnector {
  connector: Connector;
  context: ConnectorContext;
}

@Injectable()
export class ConnectorRegistryService {
  constructor(private readonly prisma: PrismaService) {}

  async getEnabledFor(householdId: string): Promise<EnabledConnector[]> {
    const configs = await this.prisma.connectorConfig.findMany({
      where: { householdId, enabled: true },
    });

    const enabled: EnabledConnector[] = [];
    for (const config of configs) {
      const factory = CONNECTOR_FACTORIES[config.key];
      if (!factory) {
        continue; // no implementation registered for this key yet (CALENDAR/OCR/WHATSAPP)
      }
      const context: ConnectorContext = {
        householdId,
        enabled: config.enabled,
      };
      if (config.credentials) {
        context.credentials = config.credentials as Record<string, unknown>;
      }
      if (config.lastRunAt) {
        context.lastRunAt = config.lastRunAt;
      }
      enabled.push({ connector: factory(), context });
    }
    return enabled;
  }
}
