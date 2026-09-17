'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge, Button, Input, Label } from '@cairn/ui';
import {
  ArrowRight,
  Bell,
  FileText,
  Home,
  Plus,
  Sparkles,
  Wrench,
  Zap,
} from 'lucide-react';
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

const TEMPLATES = [
  {
    title: 'Passport & Visa Expiry',
    desc: '60 days early notice for international travel documents.',
    eventType: 'DocumentExpiring' as const,
    days: '60',
    icon: FileText,
  },
  {
    title: 'Lease & Rent Warning',
    desc: '30 days early notice before tenancy renewal or end.',
    eventType: 'DocumentExpiring' as const,
    days: '30',
    icon: Home,
  },
  {
    title: 'Utility Bill Due Alert',
    desc: '7 days notice before utility payment due date.',
    eventType: 'BillDetected' as const,
    days: '7',
    icon: Zap,
  },
  {
    title: 'HVAC & Vehicle Upkeep',
    desc: '14 days early reminder for scheduled servicing.',
    eventType: 'MaintenanceDue' as const,
    days: '14',
    icon: Wrench,
  },
];

export function RuleForm({ householdId }: { householdId: string }) {
  const router = useRouter();
  const [eventType, setEventType] =
    useState<(typeof EVENT_TYPES)[number]['value']>('DocumentExpiring');
  const [days, setDays] = useState('30');
  const [submitting, setSubmitting] = useState(false);

  const applyTemplate = (
    templateEventType: typeof eventType,
    templateDays: string,
  ) => {
    setEventType(templateEventType);
    setDays(templateDays);
    toast.success('Applied recipe parameters below!');
  };

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
      toast.success('Automation rule registered!');
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : 'Failed to add rule',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const selectedTypeLabel = EVENT_TYPES.find(
    (e) => e.value === eventType,
  )?.label;

  return (
    <div className="flex flex-col gap-6">
      {/* 1. Recommended Automation Recipes */}
      <div className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span>1-Click Recommended Recipes</span>
          </span>
          <span className="text-[11px] text-muted-foreground">
            Click to populate builder
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {TEMPLATES.map((tmpl) => {
            const Icon = tmpl.icon;
            const isCurrent =
              eventType === tmpl.eventType && days === tmpl.days;
            return (
              <button
                key={tmpl.title}
                type="button"
                onClick={() => applyTemplate(tmpl.eventType, tmpl.days)}
                className={`flex flex-col items-start justify-between rounded-xl border p-3 text-left transition-colors duration-150 ${
                  isCurrent
                    ? 'border-primary/50 bg-primary/10'
                    : 'border-border bg-secondary/30 hover:border-border/80 hover:bg-secondary/60'
                }`}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-3 w-3" />
                  </div>
                  <span className="text-xs font-semibold text-foreground leading-tight">
                    {tmpl.title}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground line-clamp-2 mb-2">
                  {tmpl.desc}
                </p>
                <Badge
                  variant={isCurrent ? 'default' : 'secondary'}
                  className="text-[10px] py-0 px-1.5 font-mono"
                >
                  {tmpl.days} days
                </Badge>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Visual Rule Builder Form */}
      <form
        onSubmit={onSubmit}
        className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4"
      >
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Rule Configuration
        </span>

        <div className="flex flex-wrap items-end gap-3.5">
          <div className="space-y-1.5 min-w-[220px]">
            <Label
              htmlFor="eventType"
              className="text-xs font-medium text-foreground"
            >
              Trigger Event
            </Label>
            <select
              id="eventType"
              className="h-9 w-full rounded-lg border border-border bg-background px-3 text-xs text-foreground transition-colors focus-visible:outline-none focus-visible:border-foreground/40 focus-visible:ring-1 focus-visible:ring-foreground/20"
              value={eventType}
              onChange={(event) =>
                setEventType(event.target.value as typeof eventType)
              }
            >
              {EVENT_TYPES.map((option) => (
                <option
                  key={option.value}
                  value={option.value}
                  className="bg-popover text-popover-foreground"
                >
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label
              htmlFor="days"
              className="text-xs font-medium text-foreground"
            >
              Threshold (Days Prior)
            </Label>
            <Input
              id="days"
              type="number"
              min="1"
              max="365"
              className="w-28 text-xs"
              value={days}
              onChange={(event) => setDays(event.target.value)}
            />
          </div>

          <Button
            type="submit"
            disabled={submitting}
            className="shrink-0 gap-1.5 text-xs font-semibold"
          >
            <Plus className="h-3.5 w-3.5" />
            {submitting ? 'Registering...' : 'Save Automation Rule'}
          </Button>
        </div>

        {/* 3. Visual Pipeline Flow Preview */}
        <div className="mt-2 flex flex-col sm:flex-row items-center gap-2 rounded-xl bg-secondary/30 p-3 border border-border/40 text-xs">
          <div className="flex items-center gap-1.5 font-medium text-foreground">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 text-primary text-[10px] font-bold">
              1
            </span>
            <span>{selectedTypeLabel}</span>
          </div>

          <ArrowRight className="hidden sm:inline h-3.5 w-3.5 text-muted-foreground" />

          <div className="flex items-center gap-1.5 font-medium text-amber-600 dark:text-amber-400">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500/20 text-amber-600 text-[10px] font-bold">
              2
            </span>
            <span>Within {days} days</span>
          </div>

          <ArrowRight className="hidden sm:inline h-3.5 w-3.5 text-muted-foreground" />

          <div className="flex items-center gap-1.5 font-medium text-emerald-600 dark:text-emerald-400">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-600 text-[10px] font-bold">
              3
            </span>
            <Bell className="h-3 w-3" />
            <span>Dispatch Automated Alert</span>
          </div>
        </div>
      </form>
    </div>
  );
}
