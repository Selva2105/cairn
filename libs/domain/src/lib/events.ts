import { z } from 'zod';

import { EVENT_TYPES } from '@cairn/shared-constants';

const baseEventSchema = z.object({
  id: z.string().uuid(),
  householdId: z.string().uuid(),
  occurredAt: z.string().datetime(),
  source: z.enum(['gmail', 'calendar', 'manual', 'ocr']),
  dedupeKey: z.string().min(1),
  // Fuzzy connectors (Gmail/Calendar heuristic parsing, OCR) attach this; the rules engine
  // routes 'low' to a review-queue notification instead of an authoritative digest entry.
  // See CAIRN_CONNECTORS_ENGINEERING.md §5.
  confidence: z.enum(['high', 'low']).optional(),
});

export const billDetectedSchema = baseEventSchema.extend({
  type: z.literal(EVENT_TYPES.BILL_DETECTED),
  payload: z.object({
    vendor: z.string().min(1),
    amount: z.number().positive(),
    currency: z.string().length(3),
    dueDate: z.string().datetime(),
    isRecurring: z.boolean(),
    billId: z.string().optional(),
    isReminder: z.boolean().optional(),
    isOverdue: z.boolean().optional(),
    daysUntilDue: z.number().optional(),
    reminderThreshold: z.number().optional(),
  }),
});

export const documentExpiringSchema = baseEventSchema.extend({
  type: z.literal(EVENT_TYPES.DOCUMENT_EXPIRING),
  payload: z.object({
    documentType: z.string().min(1),
    expiresOn: z.string().datetime(),
    documentId: z.string().optional(),
    documentLabel: z.string().optional(),
    daysUntilExpiry: z.number().optional(),
    reminderThreshold: z.number().optional(),
    isExpired: z.boolean().optional(),
  }),
});

export const maintenanceDueSchema = baseEventSchema.extend({
  type: z.literal(EVENT_TYPES.MAINTENANCE_DUE),
  payload: z.object({
    asset: z.string().min(1),
    task: z.string().min(1),
    dueOn: z.string().datetime(),
  }),
});

export const taskExtractedSchema = baseEventSchema.extend({
  type: z.literal(EVENT_TYPES.TASK_EXTRACTED),
  payload: z.object({
    description: z.string().min(1),
    assigneeId: z.string().uuid().optional(),
    dueOn: z.string().datetime().optional(),
  }),
});

export const domainEventSchema = z.discriminatedUnion('type', [
  billDetectedSchema,
  documentExpiringSchema,
  maintenanceDueSchema,
  taskExtractedSchema,
]);

export type BaseEvent = z.infer<typeof baseEventSchema>;
export type BillDetected = z.infer<typeof billDetectedSchema>;
export type DocumentExpiring = z.infer<typeof documentExpiringSchema>;
export type MaintenanceDue = z.infer<typeof maintenanceDueSchema>;
export type TaskExtracted = z.infer<typeof taskExtractedSchema>;
export type DomainEvent = z.infer<typeof domainEventSchema>;
