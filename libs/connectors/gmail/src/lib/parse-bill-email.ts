export interface ParsedBillEmail {
  vendor: string;
  amount: number;
  currency: string;
  dueDate: string; // ISO
  isRecurring: boolean;
  // 'low' when the vendor name fell back to the raw From header (no "Name <email>" structure
  // to extract from) -- the rules engine routes 'low' to a review-queue notification instead
  // of an authoritative digest entry. See CAIRN_CONNECTORS_ENGINEERING.md §5.
  confidence: 'high' | 'low';
}

const AMOUNT_PATTERN = /(?:INR|Rs\.?|₹|\$|USD)\s?([\d,]+(?:\.\d{1,2})?)/i;
const DUE_DATE_PATTERN =
  /due\s*(?:date)?[:\s]+([A-Za-z0-9,/\-\s]+?)(?:\.|\n|$)/i;
const RECURRING_PATTERN = /subscription|recurring|auto-?renew/i;

/**
 * MVP heuristic bill detection: regex over the subject/body rather than an ML classifier.
 * See ARCHITECTURE.md §9 (rules engine v1 is hardcoded before a DSL) and the risk register
 * entry on false positives -- a confidence threshold / review queue is roadmap, not v1.
 */
export function parseBillEmail(params: {
  from: string;
  subject: string;
  body: string;
}): ParsedBillEmail | null {
  const amountMatch =
    params.body.match(AMOUNT_PATTERN) ?? params.subject.match(AMOUNT_PATTERN);
  const dueDateMatch = params.body.match(DUE_DATE_PATTERN);
  if (!amountMatch || !dueDateMatch) {
    return null;
  }

  const rawAmount = amountMatch[1];
  const rawDueDate = dueDateMatch[1];
  if (!rawAmount || !rawDueDate) {
    return null;
  }

  const amount = Number(rawAmount.replace(/,/g, ''));
  const dueDate = new Date(rawDueDate.trim());
  if (Number.isNaN(amount) || Number.isNaN(dueDate.getTime())) {
    return null;
  }

  const vendor = extractVendorName(params.from);

  return {
    vendor: vendor.name,
    amount,
    currency: /\$|USD/i.test(amountMatch[0]) ? 'USD' : 'INR',
    dueDate: dueDate.toISOString(),
    isRecurring: RECURRING_PATTERN.test(`${params.subject} ${params.body}`),
    confidence: vendor.wasStructured ? 'high' : 'low',
  };
}

function extractVendorName(from: string): {
  name: string;
  wasStructured: boolean;
} {
  const match = from.match(/^"?([^"<]+)"?\s*</);
  return match?.[1]
    ? { name: match[1].trim(), wasStructured: true }
    : { name: from.trim(), wasStructured: false };
}
