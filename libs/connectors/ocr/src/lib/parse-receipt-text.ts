export interface ParsedReceipt {
  vendor: string;
  amount: number;
  currency: string;
  dueDate: string; // ISO -- the receipt/purchase date, used as the "due" date for a one-off bill
  isRecurring: boolean;
  confidence: 'high' | 'low';
}

const AMOUNT_PATTERN = /(?:INR|Rs\.?|₹|\$|USD)\s?([\d,]+(?:\.\d{1,2})?)/gi;
const DATE_PATTERN = /\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}-\d{2}-\d{2})\b/;
const TOTAL_LINE_PATTERN = /total/i;

/**
 * Receipt OCR text is noisier than an email body -- no "From:" header, no labeled fields, and
 * Tesseract itself introduces its own errors. This is deliberately the loosest heuristic of
 * the three connectors: the vendor is just the first non-empty line, and the amount prefers
 * whichever currency-prefixed number appears on a line containing "total" (receipts almost
 * always label the final amount that way) before falling back to the largest amount found
 * anywhere. See CAIRN_CONNECTORS_ENGINEERING.md §6.
 */
export function parseReceiptText(rawText: string): ParsedReceipt | null {
  const lines = rawText
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return null;
  }

  const totalLine = lines.find((line) => TOTAL_LINE_PATTERN.test(line));
  const amountSource = totalLine ?? rawText;
  const amounts = [...amountSource.matchAll(AMOUNT_PATTERN)].map((match) =>
    Number(match[1]?.replace(/,/g, '')),
  );
  const amount = amounts.length > 0 ? Math.max(...amounts) : null;
  if (amount === null || Number.isNaN(amount)) {
    return null;
  }

  const dateMatch = rawText.match(DATE_PATTERN);
  const dueDate = dateMatch ? new Date(dateMatch[1] ?? '') : new Date();
  if (Number.isNaN(dueDate.getTime())) {
    return null;
  }

  return {
    vendor: lines[0] ?? 'Unknown vendor',
    amount,
    currency: /\$|USD/i.test(amountSource) ? 'USD' : 'INR',
    dueDate: dueDate.toISOString(),
    isRecurring: false,
    // OCR + a first-line-is-vendor guess is inherently noisier than a structured email
    // header or a hand-typed WhatsApp command -- never call this 'high'.
    confidence: 'low',
  };
}
