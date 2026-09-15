import { createHash } from 'node:crypto';

/**
 * Idempotency key for the event pipeline: a hash of the fields that identify "the same
 * real-world fact" -- not "the same API response." Too narrow (just an external message ID)
 * and a legitimately corrected bill never re-fires; too broad (a fetch timestamp) and a real
 * duplicate is never caught. See CAIRN_WORKER_ENGINEERING.md §6 and ARCHITECTURE.md §8.
 */
export function hashDedupeKey(parts: (string | number)[]): string {
  return createHash('sha256').update(parts.join('::')).digest('hex');
}
