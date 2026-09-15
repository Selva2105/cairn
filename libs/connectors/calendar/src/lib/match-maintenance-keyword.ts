const MAINTENANCE_KEYWORDS = [
  'service',
  'renewal',
  'mot',
  'inspection',
  'maintenance',
  'checkup',
  'warranty',
];

export interface ParsedMaintenanceEvent {
  asset: string;
  task: string;
  dueOn: string; // ISO
  confidence: 'high' | 'low';
}

/**
 * Calendar events are free text -- this is the fuzziest connector by design (no structured
 * amount/date fields to anchor on like Gmail's bill parsing). A title containing one of the
 * maintenance keywords produces a 'low' confidence match unless the calendar owner used a
 * consistent "<asset> - <task>" title format, which bumps it to 'high'.
 * See CAIRN_CONNECTORS_ENGINEERING.md §4.
 */
export function matchMaintenanceKeyword(params: {
  title: string;
  startDate: string;
}): ParsedMaintenanceEvent | null {
  const lowerTitle = params.title.toLowerCase();
  const matchedKeyword = MAINTENANCE_KEYWORDS.find((keyword) =>
    lowerTitle.includes(keyword),
  );
  if (!matchedKeyword) {
    return null;
  }

  const dueOn = new Date(params.startDate);
  if (Number.isNaN(dueOn.getTime())) {
    return null;
  }

  const structured = params.title.match(/^(.+?)\s*[-:]\s*(.+)$/);
  const [asset, task] = structured
    ? [structured[1]?.trim(), structured[2]?.trim()]
    : [params.title.trim(), matchedKeyword];

  return {
    asset: asset ?? params.title.trim(),
    task: task ?? matchedKeyword,
    dueOn: dueOn.toISOString(),
    confidence: structured ? 'high' : 'low',
  };
}
