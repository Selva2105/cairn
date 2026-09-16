import { describe, expect, it } from 'vitest';

import {
  buildEmailContent,
  buildHouseholdInviteEmail,
} from './email-templates';

function baseEvent(overrides: Record<string, unknown>) {
  return {
    id: 'evt-1',
    householdId: 'household-1',
    occurredAt: new Date().toISOString(),
    source: 'manual',
    dedupeKey: 'dedupe-1',
    ...overrides,
  } as never;
}

describe('buildEmailContent', () => {
  it('renders a "has expired" headline for a document past its expiry', () => {
    const threeDaysAgo = new Date(
      Date.now() - 3 * 24 * 60 * 60 * 1000,
    ).toISOString();
    const { subject, body } = buildEmailContent(
      baseEvent({
        type: 'DocumentExpiring',
        payload: { documentType: 'passport', expiresOn: threeDaysAgo },
      }),
    );
    expect(subject).toContain('has expired');
    expect(body).toContain('Passport');
    expect(body).toContain('View documents');
  });

  it('renders an "expiring soon" headline for a document not yet due', () => {
    const in10Days = new Date(
      Date.now() + 10 * 24 * 60 * 60 * 1000,
    ).toISOString();
    const { subject } = buildEmailContent(
      baseEvent({
        type: 'DocumentExpiring',
        payload: { documentType: 'insurance', expiresOn: in10Days },
      }),
    );
    expect(subject).toContain('expiring soon');
  });

  it('renders bill details including vendor and amount', () => {
    const { subject, body } = buildEmailContent(
      baseEvent({
        type: 'BillDetected',
        payload: {
          vendor: 'Acme Electric',
          amount: 42.5,
          currency: 'USD',
          dueDate: new Date().toISOString(),
          isRecurring: true,
        },
      }),
    );
    expect(subject).toContain('Acme Electric');
    expect(body).toContain('USD 42.50');
    expect(body).toContain('recurring');
  });

  it('renders maintenance details including asset and task', () => {
    const { subject, body } = buildEmailContent(
      baseEvent({
        type: 'MaintenanceDue',
        payload: {
          asset: 'Car',
          task: 'Annual service',
          dueOn: new Date().toISOString(),
        },
      }),
    );
    expect(subject).toContain('Car');
    expect(body).toContain('Annual service');
  });

  it('renders task description and omits the due line when absent', () => {
    const { body } = buildEmailContent(
      baseEvent({
        type: 'TaskExtracted',
        payload: { description: 'Renew the car insurance' },
      }),
    );
    expect(body).toContain('Renew the car insurance');
    expect(body).not.toContain('Due ');
  });
});

describe('buildHouseholdInviteEmail', () => {
  it('renders the inviter, household, and a join link CTA', () => {
    const { subject, body } = buildHouseholdInviteEmail({
      householdName: 'The Smiths',
      inviterName: 'Selva',
      joinUrl: 'https://example.com/join?token=abc123',
    });
    expect(subject).toContain('Selva invited you to join The Smiths');
    expect(body).toContain('https://example.com/join?token=abc123');
    expect(body).toContain('Accept invite');
  });
});
