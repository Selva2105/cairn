import { randomUUID } from 'node:crypto';

import type {
  Connector,
  ConnectorContext,
  DomainEvent,
  RawSignal,
} from '@cairn/domain';
import { hashDedupeKey } from '@cairn/shared-utils';
import { gmail_v1, google } from 'googleapis';

import { parseBillEmail } from './parse-bill-email';

interface GmailCredentials {
  accessToken: string;
}

export class GmailConnector implements Connector {
  readonly key = 'GMAIL' as const;
  readonly schedule = 'cron' as const;

  async fetch(context: ConnectorContext): Promise<RawSignal[]> {
    const credentials = context.credentials as GmailCredentials | undefined;
    if (!credentials?.accessToken) {
      throw new Error(
        'Gmail connector requires an OAuth access token in ConnectorContext.credentials',
      );
    }

    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: credentials.accessToken });
    const gmail = google.gmail({ version: 'v1', auth });

    const list = await gmail.users.messages.list({
      userId: 'me',
      q: 'label:bills newer_than:7d',
      maxResults: 25,
    });

    const signals: RawSignal[] = [];
    for (const message of list.data.messages ?? []) {
      if (!message.id) continue;
      const full = await gmail.users.messages.get({
        userId: 'me',
        id: message.id,
        format: 'full',
      });
      signals.push({ externalId: message.id, raw: full.data });
    }

    return signals;
  }

  normalize(raw: RawSignal): DomainEvent {
    const message = raw.raw as gmail_v1.Schema$Message;
    const headers = message.payload?.headers ?? [];
    const from = headers.find((header) => header.name === 'From')?.value ?? '';
    const subject =
      headers.find((header) => header.name === 'Subject')?.value ?? '';
    const body = extractPlainTextBody(message) ?? message.snippet ?? '';

    const parsed = parseBillEmail({ from, subject, body });
    if (!parsed) {
      throw new Error(
        `Gmail message ${raw.externalId} did not match the bill-detection heuristic`,
      );
    }

    const { confidence, ...payload } = parsed;

    return {
      id: randomUUID(),
      // The connector doesn't know which household it's running for -- the caller
      // (worker/pipeline) sets this from the ConnectorContext before persisting.
      householdId: '',
      occurredAt: new Date().toISOString(),
      source: 'gmail',
      dedupeKey: hashDedupeKey([this.key, raw.externalId]),
      type: 'BillDetected',
      confidence,
      payload,
    };
  }
}

function extractPlainTextBody(message: gmail_v1.Schema$Message): string | null {
  const part = message.payload?.parts?.find((p) => p.mimeType === 'text/plain');
  const data = part?.body?.data ?? message.payload?.body?.data;
  return data ? Buffer.from(data, 'base64url').toString('utf-8') : null;
}
