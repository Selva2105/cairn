import { EVENT_TYPES, type EventType } from '@cairn/shared-constants';

export interface ParsedCommand {
  type: EventType;
  payload: Record<string, unknown>;
}

const BILL_PATTERN = /^bill\s+(.+?)\s+(\d+(?:\.\d{1,2})?)\s+(\S+)$/i;
const DOC_PATTERN =
  /^doc\s+(passport|insurance|warranty|registration|other)\s+(\S+)$/i;
const TASK_PATTERN = /^task\s+(.+)$/i;

/**
 * Small command grammar for WhatsApp inbound messages, e.g. "bill Electricity 1200 15-Oct" or
 * "doc passport 2027-03-01". Keeps the WhatsApp webhook controller thin -- it doesn't know
 * about bills or documents, it just extracts a command and hands it to normalize().
 * See CAIRN_CONNECTORS_ENGINEERING.md §5.
 */
export function parseWhatsAppCommand(text: string): ParsedCommand | null {
  const trimmed = text.trim();

  const bill = trimmed.match(BILL_PATTERN);
  if (bill) {
    const [, vendor, rawAmount, rawDate] = bill;
    const dueDate = parseFlexibleDate(rawDate ?? '');
    if (!vendor || !rawAmount || !dueDate) {
      return null;
    }
    return {
      type: EVENT_TYPES.BILL_DETECTED,
      payload: {
        vendor: vendor.trim(),
        amount: Number(rawAmount),
        currency: 'INR',
        dueDate: dueDate.toISOString(),
        isRecurring: false,
      },
    };
  }

  const doc = trimmed.match(DOC_PATTERN);
  if (doc) {
    const [, documentType, rawDate] = doc;
    const expiresOn = parseFlexibleDate(rawDate ?? '');
    if (!documentType || !expiresOn) {
      return null;
    }
    return {
      type: EVENT_TYPES.DOCUMENT_EXPIRING,
      payload: {
        documentType: documentType.toLowerCase(),
        expiresOn: expiresOn.toISOString(),
      },
    };
  }

  const task = trimmed.match(TASK_PATTERN);
  if (task) {
    const [, description] = task;
    if (!description) {
      return null;
    }
    return {
      type: EVENT_TYPES.TASK_EXTRACTED,
      payload: { description: description.trim() },
    };
  }

  return null;
}

function parseFlexibleDate(raw: string): Date | null {
  const direct = new Date(raw);
  if (!Number.isNaN(direct.getTime())) {
    return direct;
  }
  // "15-Oct" style with no year -- assume the current year.
  const withYear = new Date(`${raw}-${new Date().getFullYear()}`);
  return Number.isNaN(withYear.getTime()) ? null : withYear;
}
