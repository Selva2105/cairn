import type { DomainEvent } from '@cairn/domain';

export interface EmailContent {
  subject: string;
  body: string;
  text?: string;
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

export function renderBrandedEmail(
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

function formatDocumentType(type?: string): string {
  if (!type) return 'Document';
  const lower = type.toLowerCase();
  if (DOCUMENT_TYPE_LABELS[lower]) {
    return DOCUMENT_TYPE_LABELS[lower];
  }
  return lower
    .split(/[_\s]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/**
 * Renders branded HTML email and WhatsApp plain text per domain event type.
 */
export function buildEmailContent(event: DomainEvent): EmailContent {
  switch (event.type) {
    case 'DocumentExpiring': {
      const expiresOn = new Date(event.payload.expiresOn);
      const isExpired =
        event.payload.isExpired ?? expiresOn.getTime() <= Date.now();
      const typeLabel = formatDocumentType(event.payload.documentType);
      const docName = event.payload.documentLabel || typeLabel;
      const daysLeft = event.payload.daysUntilExpiry;

      let headline: string;
      if (isExpired) {
        headline = `${docName} has expired`;
      } else if (daysLeft !== undefined && daysLeft <= 1) {
        headline = `${docName} expires today`;
      } else if (daysLeft !== undefined) {
        headline = `${docName} expires in ${daysLeft} days`;
      } else {
        headline = `${docName} is expiring soon`;
      }

      const formattedDate = formatDateTime(event.payload.expiresOn);
      const docUrl = `${APP_URL}/dashboard/documents`;
      const plainText = `*${headline}*\nType: ${typeLabel}\n${isExpired ? 'Expired on' : 'Expires on'}: ${formattedDate}\nView in Cairn: ${docUrl}`;

      return {
        subject: `Cairn: ${headline}`,
        body: renderBrandedEmail(
          headline,
          `<p style="margin:0;"><strong>${docName}</strong> (${typeLabel}) ${isExpired ? 'expired on' : 'expires on'} <strong>${formattedDate}</strong>.</p>`,
          docUrl,
          'View documents',
        ),
        text: plainText,
      };
    }

    case 'BillDetected': {
      const isOverdue =
        event.payload.isOverdue ??
        new Date(event.payload.dueDate).getTime() <= Date.now();
      const daysLeft = event.payload.daysUntilDue;
      const amount = `${event.payload.currency} ${event.payload.amount.toFixed(2)}`;
      const formattedDate = formatDateTime(event.payload.dueDate);
      const overviewUrl = `${APP_URL}/dashboard/overview`;

      let headline: string;
      if (isOverdue) {
        headline = `Bill from ${event.payload.vendor} is overdue`;
      } else if (daysLeft !== undefined && daysLeft <= 1) {
        headline = `Bill from ${event.payload.vendor} is due today`;
      } else if (daysLeft !== undefined) {
        headline = `Bill from ${event.payload.vendor} is due in ${daysLeft} days`;
      } else {
        headline = `New bill from ${event.payload.vendor}`;
      }

      const plainText = `*${headline}*\nAmount: ${amount}\nDue date: ${formattedDate}${event.payload.isRecurring ? ' (Recurring)' : ''}\nView in Cairn: ${overviewUrl}`;

      return {
        subject: `Cairn: ${headline}`,
        body: renderBrandedEmail(
          headline,
          `<p style="margin:0;"><strong>${amount}</strong> due <strong>${formattedDate}</strong>${event.payload.isRecurring ? ' &mdash; recurring' : ''}.</p>`,
          overviewUrl,
          'View overview',
        ),
        text: plainText,
      };
    }

    case 'MaintenanceDue': {
      const headline = `${event.payload.asset} needs attention`;
      const formattedDate = formatDateTime(event.payload.dueOn);
      const overviewUrl = `${APP_URL}/dashboard/overview`;
      const plainText = `*${headline}*\nTask: ${event.payload.task}\nDue: ${formattedDate}\nView in Cairn: ${overviewUrl}`;

      return {
        subject: `Cairn: ${headline}`,
        body: renderBrandedEmail(
          headline,
          `<p style="margin:0;"><strong>${event.payload.task}</strong> is due <strong>${formattedDate}</strong>.</p>`,
          overviewUrl,
          'View overview',
        ),
        text: plainText,
      };
    }

    case 'TaskExtracted': {
      const headline = 'New task detected';
      const dueLine = event.payload.dueOn
        ? `<p style="margin:8px 0 0;color:${CLAY_700};font-size:13px;">Due ${formatDateTime(event.payload.dueOn)}</p>`
        : '';
      const tasksUrl = `${APP_URL}/dashboard/tasks`;
      const plainText = `*${headline}*\n${event.payload.description}${event.payload.dueOn ? `\nDue: ${formatDateTime(event.payload.dueOn)}` : ''}\nView in Cairn: ${tasksUrl}`;

      return {
        subject: `Cairn: ${headline}`,
        body: renderBrandedEmail(
          headline,
          `<p style="margin:0;">${event.payload.description}</p>${dueLine}`,
          tasksUrl,
          'View tasks',
        ),
        text: plainText,
      };
    }
  }
}

export interface HouseholdInviteEmailParams {
  householdName: string;
  inviterName: string;
  joinUrl: string;
}

export function buildHouseholdInviteEmail({
  householdName,
  inviterName,
  joinUrl,
}: HouseholdInviteEmailParams): EmailContent {
  const headline = `${inviterName} invited you to join ${householdName}`;
  return {
    subject: `Cairn: ${headline}`,
    body: renderBrandedEmail(
      headline,
      `<p style="margin:0;">Cairn helps ${householdName} keep track of bills, documents, and maintenance before anything slips through the cracks. Join to see what's already being tracked.</p>`,
      joinUrl,
      'Accept invite',
    ),
    text: `*${headline}*\nJoin your household on Cairn: ${joinUrl}`,
  };
}

export interface PasswordResetEmailParams {
  userName: string;
  resetUrl: string;
}

export function buildPasswordResetEmail({
  userName,
  resetUrl,
}: PasswordResetEmailParams): EmailContent {
  const headline = 'Reset your Cairn password';
  return {
    subject: 'Cairn: Reset your password',
    body: renderBrandedEmail(
      headline,
      `<p style="margin:0;">Hi ${userName},</p><p style="margin:12px 0 0;">We received a request to reset the password for your Cairn account. Click the button below to choose a new password. This link will expire in 1 hour.</p><p style="margin:12px 0 0;font-size:12px;color:${CLAY_700};">If you didn't request a password reset, you can safely ignore this email.</p>`,
      resetUrl,
      'Reset password',
    ),
    text: `Hi ${userName},\nReset your Cairn password here (link valid for 1 hour): ${resetUrl}`,
  };
}
