import { createHash } from 'node:crypto';

/**
 * Idempotency key for the event pipeline: a hash of source + external ID + the fields that
 * make an event meaningfully unique. Re-syncing a mailbox and re-parsing the same email must
 * produce the same key so the worker's EventLog check can dedupe it -- see ARCHITECTURE.md §8.
 */
export function hashDedupeKey(
  source: string,
  externalId: string,
  ...rest: string[]
): string {
  return createHash('sha256')
    .update([source, externalId, ...rest].join('::'))
    .digest('hex');
}
