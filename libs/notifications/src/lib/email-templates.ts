import type { DomainEvent } from '@cairn/domain';

export interface EmailContent {
  subject: string;
  body: string;
}

// Matches apps/web's clay theme (libs/ui/src/theme/colors.ts) so the email doesn't look like a
// different product -- clay-500 for the brand accent, clay-50/900/200 for background/text/border.
const CLAY_500 = '#BD5B2C';
const CLAY_50 = '#FBF3EE';
const CLAY_200 = '#EBC5AE';
const CLAY_900 = '#46200F';
const CLAY_700 = '#7E3A1B';

const APP_URL = process.env.WEB_APP_ORIGIN ?? 'http://localhost:4200';

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function layout(
  headline: string,
  bodyHtml: string,
  ctaHref: string,
  ctaLabel: string,
): string {
  return `<div style="font-family:-apple-system,'Segoe UI',Roboto,sans-serif;max-width:480px;margin:0 auto;">
  <div style="background:${CLAY_500};padding:20px 24px;border-radius:10px 10px 0 0;">
    <span style="color:${CLAY_50};font-size:18px;font-weight:600;letter-spacing:0.02em;">Cairn</span>
  </div>
  <div style="border:1px solid ${CLAY_200};border-top:none;border-radius:0 0 10px 10px;padding:24px;background:#ffffff;">
    <h1 style="font-size:18px;margin:0 0 12px;color:${CLAY_900};">${headline}</h1>
    <div style="font-size:14px;line-height:1.6;color:${CLAY_900};">${bodyHtml}</div>
    <a href="${ctaHref}" style="display:inline-block;margin-top:20px;padding:10px 20px;background:${CLAY_500};color:${CLAY_50};text-decoration:none;border-radius:6px;font-size:14px;font-weight:500;">${ctaLabel}</a>
  </div>
  <p style="font-size:12px;color:${CLAY_700};text-align:center;margin-top:16px;">
    You're receiving this because your household uses Cairn to track this for you.
  </p>
</div>`;
}

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  passport: 'Passport',
  insurance: 'Insurance policy',
  warranty: 'Warranty',
  registration: 'Registration',
  other: 'Document',
};

/**
 * Renders a proper branded HTML email per domain event type, instead of dumping the raw event
 * payload as JSON. DocumentExpiring covers both the "coming up" reminder and the "has now
 * expired" alert (see document-expiry-scanner.service.ts) -- distinguished here by comparing
 * expiresOn against the current time at send time, not by a separate event type.
 */
export function buildEmailContent(event: DomainEvent): EmailContent {
  switch (event.type) {
    case 'DocumentExpiring': {
      const expiresOn = new Date(event.payload.expiresOn);
      const isExpired = expiresOn.getTime() <= Date.now();
      const label =
        DOCUMENT_TYPE_LABELS[event.payload.documentType] ?? 'Document';
      const headline = isExpired
        ? `${label} has expired`
        : `${label} is expiring soon`;
      return {
        subject: `Cairn: ${headline}`,
        body: layout(
          headline,
          `<p style="margin:0;">${isExpired ? 'This expired on' : 'This expires on'} <strong>${formatDateTime(event.payload.expiresOn)}</strong>.</p>`,
          `${APP_URL}/dashboard/documents`,
          'View documents',
        ),
      };
    }

    case 'BillDetected': {
      const headline = `New bill from ${event.payload.vendor}`;
      const amount = `${event.payload.currency} ${event.payload.amount.toFixed(2)}`;
      return {
        subject: `Cairn: ${headline}`,
        body: layout(
          headline,
          `<p style="margin:0;"><strong>${amount}</strong> due <strong>${formatDateTime(event.payload.dueDate)}</strong>${event.payload.isRecurring ? ' &mdash; recurring' : ''}.</p>`,
          `${APP_URL}/dashboard/overview`,
          'View overview',
        ),
      };
    }

    case 'MaintenanceDue': {
      const headline = `${event.payload.asset} needs attention`;
      return {
        subject: `Cairn: ${headline}`,
        body: layout(
          headline,
          `<p style="margin:0;"><strong>${event.payload.task}</strong> is due <strong>${formatDateTime(event.payload.dueOn)}</strong>.</p>`,
          `${APP_URL}/dashboard/overview`,
          'View overview',
        ),
      };
    }

    case 'TaskExtracted': {
      const headline = 'New task detected';
      const dueLine = event.payload.dueOn
        ? `<p style="margin:8px 0 0;color:${CLAY_700};font-size:13px;">Due ${formatDateTime(event.payload.dueOn)}</p>`
        : '';
      return {
        subject: `Cairn: ${headline}`,
        body: layout(
          headline,
          `<p style="margin:0;">${event.payload.description}</p>${dueLine}`,
          `${APP_URL}/dashboard/tasks`,
          'View tasks',
        ),
      };
    }
  }
}
