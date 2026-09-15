import { randomUUID } from 'node:crypto';

import type {
  Connector,
  ConnectorContext,
  DomainEvent,
  RawSignal,
} from '@cairn/domain';
import { hashDedupeKey } from '@cairn/shared-utils';
import { calendar_v3, google } from 'googleapis';

import { matchMaintenanceKeyword } from './match-maintenance-keyword';

interface CalendarCredentials {
  accessToken: string;
  syncToken?: string; // from a prior run's response -- see the note on write-back below
}

/**
 * Uses a sync token for incremental fetches after the first full sync, per
 * CAIRN_CONNECTORS_ENGINEERING.md §4. Note: this connector reads a syncToken from
 * ConnectorContext.credentials but has no way to persist the *new* one the API returns back
 * to ConnectorConfig -- the Connector interface's fetch() is read-only by design. Until the
 * registry gains a write-back hook, every run after the first re-does a full sync rather than
 * a true incremental one; documented here rather than silently pretending it's wired up.
 */
export class CalendarConnector implements Connector {
  readonly key = 'CALENDAR' as const;
  readonly schedule = 'cron' as const;

  async fetch(context: ConnectorContext): Promise<RawSignal[]> {
    const credentials = context.credentials as CalendarCredentials | undefined;
    if (!credentials?.accessToken) {
      throw new Error(
        'Calendar connector requires an OAuth access token in ConnectorContext.credentials',
      );
    }

    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: credentials.accessToken });
    const calendar = google.calendar({ version: 'v3', auth });

    const list = await calendar.events.list({
      calendarId: 'primary',
      ...(credentials.syncToken
        ? { syncToken: credentials.syncToken }
        : {
            timeMin: new Date().toISOString(),
            singleEvents: true,
            orderBy: 'startTime',
          }),
      maxResults: 50,
    });

    return (list.data.items ?? [])
      .filter((event): event is calendar_v3.Schema$Event & { id: string } =>
        Boolean(event.id),
      )
      .map((event) => ({ externalId: event.id, raw: event }));
  }

  normalize(raw: RawSignal): DomainEvent {
    const event = raw.raw as calendar_v3.Schema$Event;
    const title = event.summary ?? '';
    const startDate = event.start?.dateTime ?? event.start?.date ?? '';

    const parsed = matchMaintenanceKeyword({ title, startDate });
    if (!parsed) {
      throw new Error(
        `Calendar event ${raw.externalId} did not match a maintenance keyword`,
      );
    }

    const { confidence, ...payload } = parsed;

    return {
      id: randomUUID(),
      householdId: '',
      occurredAt: new Date().toISOString(),
      source: 'calendar',
      dedupeKey: hashDedupeKey([this.key, raw.externalId]),
      type: 'MaintenanceDue',
      confidence,
      payload,
    } as DomainEvent;
  }
}
