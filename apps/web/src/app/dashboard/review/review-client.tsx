'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge, Button, Card, CardContent } from '@cairn/ui';
import { CheckCircle2, ShieldQuestion, XCircle } from 'lucide-react';

import { toast } from 'sonner';

import { ApiError } from '../../../lib/api-error';
import { browserApiFetch } from '../../../lib/api-client-browser';

export interface ReviewEventData {
  id: string;
  type: string;
  source: string;
  payload: Record<string, unknown>;
  occurredAt: string;
}

const EVENT_TYPE_LABEL: Record<string, string> = {
  BILL_DETECTED: 'Bill detected',
  DOCUMENT_EXPIRING: 'Document expiring',
  MAINTENANCE_DUE: 'Maintenance due',
  TASK_EXTRACTED: 'Task extracted',
};

function summarizeEvent(event: ReviewEventData): string {
  const { payload } = event;
  if (event.type === 'BILL_DETECTED' && payload.vendor) {
    return `${payload.vendor} — ${payload.currency ?? ''} ${payload.amount ?? '?'}`.trim();
  }
  if (event.type === 'DOCUMENT_EXPIRING' && payload.documentType) {
    return String(payload.documentType);
  }
  if (event.type === 'MAINTENANCE_DUE' && payload.task) {
    return String(payload.task);
  }
  if (event.type === 'TASK_EXTRACTED' && payload.description) {
    return String(payload.description);
  }
  return 'Details unavailable';
}

export function ReviewClient({
  events,
  householdId,
}: {
  events: ReviewEventData[];
  householdId: string;
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);

  const approve = async (eventId: string) => {
    setBusyId(eventId);
    try {
      await browserApiFetch(
        `/households/${householdId}/events/${eventId}/approve`,
        { method: 'POST' },
      );
      toast.success('Approved — notifying your household');
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : 'Failed to approve',
      );
    } finally {
      setBusyId(null);
    }
  };

  const dismiss = async (eventId: string) => {
    setBusyId(eventId);
    try {
      await browserApiFetch(
        `/households/${householdId}/events/${eventId}/dismiss`,
        { method: 'POST' },
      );
      toast.success('Dismissed');
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : 'Failed to dismiss',
      );
    } finally {
      setBusyId(null);
    }
  };

  if (events.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-muted border border-border text-muted-foreground mb-3">
            <ShieldQuestion className="h-5 w-5 opacity-60" />
          </div>
          <p className="text-sm font-semibold text-foreground">
            Nothing to review
          </p>
          <p className="text-xs text-muted-foreground max-w-sm mt-1">
            Low-confidence detections from your connectors will show up here for
            a quick approve or dismiss.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <ul className="flex flex-col gap-2.5">
      {events.map((event) => {
        const busy = busyId === event.id;
        return (
          <li
            key={event.id}
            className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card p-3.5"
          >
            <div className="flex flex-col gap-1 min-w-0">
              <div className="flex items-center gap-2">
                <Badge variant="warning" className="text-[10px]">
                  {EVENT_TYPE_LABEL[event.type] ?? event.type}
                </Badge>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
                  via {event.source.toLowerCase()}
                </span>
              </div>
              <p className="text-sm font-medium text-foreground truncate">
                {summarizeEvent(event)}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={busy}
                onClick={() => dismiss(event.id)}
                className="h-8 px-3 text-xs"
              >
                <XCircle className="h-3.5 w-3.5 mr-1" />
                Dismiss
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={busy}
                onClick={() => approve(event.id)}
                className="h-8 px-3 text-xs"
              >
                <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                {busy ? 'Working…' : 'Approve'}
              </Button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
