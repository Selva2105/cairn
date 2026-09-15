'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input, Label } from '@cairn/ui';
import { toast } from 'sonner';

import { ApiError } from '../../../lib/api-error';
import { browserApiFetch } from '../../../lib/api-client-browser';

const EVENT_TYPES = [
  { value: 'BillDetected', label: 'Bill detected', field: 'payload.dueDate' },
  {
    value: 'DocumentExpiring',
    label: 'Document expiring',
    field: 'payload.expiresOn',
  },
  { value: 'MaintenanceDue', label: 'Maintenance due', field: 'payload.dueOn' },
] as const;

export function RuleForm({ householdId }: { householdId: string }) {
  const router = useRouter();
  const [eventType, setEventType] =
    useState<(typeof EVENT_TYPES)[number]['value']>('DocumentExpiring');
  const [days, setDays] = useState('30');
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const lte = Number(days);
    if (!Number.isFinite(lte) || lte <= 0) return;

    const field = EVENT_TYPES.find((e) => e.value === eventType)?.field;
    setSubmitting(true);
    try {
      await browserApiFetch(`/households/${householdId}/rules`, {
        method: 'POST',
        body: JSON.stringify({
          name: `Notify within ${lte} days (${eventType})`,
          eventType,
          definition: {
            id: `${eventType.toLowerCase()}-${lte}d`,
            on: eventType,
            when: { daysUntil: { field, lte } },
            then: [
              {
                action: 'notify',
                channel: 'email',
                priority: lte <= 7 ? 'high' : 'normal',
              },
            ],
          },
        }),
      });
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : 'Failed to add rule',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-3">
      <div className="space-y-2">
        <Label htmlFor="eventType">When</Label>
        <select
          id="eventType"
          className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
          value={eventType}
          onChange={(event) =>
            setEventType(event.target.value as typeof eventType)
          }
        >
          {EVENT_TYPES.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="days">is within (days)</Label>
        <Input
          id="days"
          type="number"
          min="1"
          className="w-24"
          value={days}
          onChange={(event) => setDays(event.target.value)}
        />
      </div>
      <Button type="submit" disabled={submitting}>
        {submitting ? 'Adding...' : 'Add rule'}
      </Button>
    </form>
  );
}
