import { describe, expect, it } from 'vitest';

import { evaluateDocumentExpiring } from './hardcoded-rules';

function documentExpiringEvent(expiresOn: string) {
  return {
    id: 'evt-1',
    householdId: 'household-1',
    occurredAt: new Date().toISOString(),
    source: 'manual',
    dedupeKey: 'dedupe-1',
    type: 'DocumentExpiring',
    payload: { documentType: 'passport', expiresOn },
  } as never;
}

describe('evaluateDocumentExpiring', () => {
  it('notifies for a document expiring within the 30-day window', () => {
    const in10Days = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
    const actions = evaluateDocumentExpiring(
      documentExpiringEvent(in10Days.toISOString()),
    );
    expect(actions).toHaveLength(1);
    expect(actions[0]).toMatchObject({ action: 'notify', channel: 'email' });
  });

  it('still notifies once the document has already expired', () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    const actions = evaluateDocumentExpiring(
      documentExpiringEvent(threeDaysAgo.toISOString()),
    );
    expect(actions).toHaveLength(1);
    expect(actions[0]).toMatchObject({ action: 'notify', channel: 'email' });
  });

  it('does not notify for a document expiring well beyond the warning window', () => {
    const in90Days = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
    const actions = evaluateDocumentExpiring(
      documentExpiringEvent(in90Days.toISOString()),
    );
    expect(actions).toHaveLength(0);
  });
});
