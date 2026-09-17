'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from '@cairn/ui';
import {
  Bell,
  Check,
  Coins,
  FileCode,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

import { browserApiFetch } from '../../../../lib/api-client-browser';

export interface HouseholdConfigData {
  id: string;
  householdId: string;
  currency: string;
  currencySymbol: string;
  timezone: string;
  documentTypes: string[];
  billReminderDays: number[];
  docReminderDays: number[];
  digestTime: string;
  digestChannel: string;
  defaultTaskPriority: string;
}

const CURRENCIES = [
  { code: 'INR', symbol: '₹', label: 'INR (₹) - Indian Rupee' },
  { code: 'USD', symbol: '$', label: 'USD ($) - US Dollar' },
  { code: 'EUR', symbol: '€', label: 'EUR (€) - Euro' },
  { code: 'GBP', symbol: '£', label: 'GBP (£) - British Pound' },
  { code: 'CAD', symbol: '$', label: 'CAD ($) - Canadian Dollar' },
  { code: 'AUD', symbol: '$', label: 'AUD ($) - Australian Dollar' },
  { code: 'SGD', symbol: '$', label: 'SGD ($) - Singapore Dollar' },
  { code: 'AED', symbol: 'د.إ', label: 'AED (د.إ) - UAE Dirham' },
  { code: 'JPY', symbol: '¥', label: 'JPY (¥) - Japanese Yen' },
];

const TIMEZONES = [
  'Asia/Kolkata',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Berlin',
  'Europe/Paris',
  'Asia/Dubai',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Australia/Sydney',
];

/* ─── Chip Input ────────────────────────────────────────────────────────── */
function DaysChipInput({
  id,
  value,
  onChange,
  hint,
}: {
  id: string;
  value: number[];
  onChange: (days: number[]) => void;
  hint: string;
}) {
  const [inputVal, setInputVal] = useState('');

  const commit = () => {
    const n = parseInt(inputVal.trim(), 10);
    if (!isNaN(n) && n > 0 && !value.includes(n)) {
      onChange([...value, n].sort((a, b) => b - a));
    }
    setInputVal('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      commit();
    } else if (e.key === 'Backspace' && inputVal === '' && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  };

  const removeDay = (day: number) => onChange(value.filter((d) => d !== day));

  return (
    <div className="flex flex-col gap-2">
      {/* Input */}
      <input
        id={id}
        type="number"
        min={1}
        value={inputVal}
        onChange={(e) => setInputVal(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={commit}
        placeholder={hint}
        className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground/60 transition-colors focus-visible:outline-none focus-visible:border-foreground/40 focus-visible:ring-1 focus-visible:ring-foreground/20"
      />
      {/* Chips below */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((day) => (
            <span
              key={day}
              className="inline-flex items-center gap-1 rounded-md bg-primary/10 text-primary px-2 py-0.5 text-xs font-semibold"
            >
              {day}d
              <button
                type="button"
                onClick={() => removeDay(day)}
                className="text-primary/60 hover:text-primary transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────────────────────────── */
export function PreferencesClient({
  householdId,
  initialConfig,
}: {
  householdId: string;
  initialConfig: HouseholdConfigData;
}) {
  const router = useRouter();
  const [config, setConfig] = useState<HouseholdConfigData>(initialConfig);
  const [newDocType, setNewDocType] = useState('');
  const [saving, setSaving] = useState(false);
  const [runningScan, setRunningScan] = useState(false);

  const handleTriggerScan = async () => {
    setRunningScan(true);
    try {
      const res = await browserApiFetch<{
        documentsScanned?: number;
        billsScanned?: number;
        notified?: number;
      }>(`/households/${householdId}/pipeline/run`, {
        method: 'POST',
      });
      toast.success(
        `Scan complete: ${res.documentsScanned ?? 0} docs, ${res.billsScanned ?? 0} bills scanned. ${res.notified ?? 0} notification(s) dispatched.`,
      );
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to trigger scan',
      );
    } finally {
      setRunningScan(false);
    }
  };

  /* ── doc-type handlers ── */
  const handleAddDocType = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newDocType.trim();
    if (!trimmed) return;

    const formatted = trimmed.toUpperCase().replace(/\s+/g, '_');
    if (config.documentTypes.includes(formatted)) {
      toast.error('This document type already exists');
      return;
    }

    try {
      const res = await browserApiFetch<HouseholdConfigData>(
        `/households/${householdId}/config/document-types`,
        {
          method: 'POST',
          body: JSON.stringify({ type: formatted }),
        },
      );
      setConfig(res);
      setNewDocType('');
      toast.success(`Added document type: ${formatted}`);
      router.refresh();
    } catch {
      toast.error('Failed to add document type');
    }
  };

  const handleRemoveDocType = async (typeToRemove: string) => {
    if (config.documentTypes.length <= 1) {
      toast.error('You must keep at least one document type');
      return;
    }

    try {
      const res = await browserApiFetch<HouseholdConfigData>(
        `/households/${householdId}/config/document-types/${typeToRemove}`,
        { method: 'DELETE' },
      );
      setConfig(res);
      toast.success(`Removed document type: ${typeToRemove}`);
      router.refresh();
    } catch {
      toast.error('Failed to remove document type');
    }
  };

  const handleResetDocTypes = async () => {
    try {
      const res = await browserApiFetch<HouseholdConfigData>(
        `/households/${householdId}/config/document-types/reset`,
        { method: 'POST' },
      );
      setConfig(res);
      toast.success('Document types reset to defaults');
      router.refresh();
    } catch {
      toast.error('Failed to reset document types');
    }
  };

  /* ── general preferences save ── */
  const handleSaveGeneralPreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const selectedCurrency = CURRENCIES.find((c) => c.code === config.currency);

    try {
      const res = await browserApiFetch<HouseholdConfigData>(
        `/households/${householdId}/config`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            currency: config.currency,
            currencySymbol: selectedCurrency?.symbol ?? config.currencySymbol,
            timezone: config.timezone,
            digestTime: config.digestTime,
            digestChannel: config.digestChannel,
            defaultTaskPriority: config.defaultTaskPriority,
            docReminderDays:
              config.docReminderDays.length > 0
                ? config.docReminderDays
                : [30, 14, 1],
            billReminderDays:
              config.billReminderDays.length > 0
                ? config.billReminderDays
                : [7, 3, 1],
          }),
        },
      );
      setConfig(res);
      toast.success('Household preferences saved successfully');
      router.refresh();
    } catch {
      toast.error('Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  /* ── label style helper ── */
  const lbl = 'text-sm font-medium text-foreground';

  return (
    <div className="flex flex-col gap-6">
      {/* 1. Document Types */}
      <Card className="rounded-xl border border-border shadow-none">
        <CardHeader className="border-b border-border pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <FileCode className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold">
                  Configurable document types
                </CardTitle>
                <CardDescription className="text-xs">
                  Add, remove, or customize document categories for your
                  household vault &amp; WhatsApp bot.
                </CardDescription>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleResetDocTypes}
              className="text-xs h-8 border-border shadow-none gap-1.5"
            >
              <RefreshCw className="h-3 w-3" />
              Reset defaults
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-5 space-y-5">
          {/* Chips */}
          <div className="space-y-2">
            <Label className={lbl}>
              Active types ({config.documentTypes.length})
            </Label>
            <div className="flex flex-wrap gap-2 pt-1">
              {config.documentTypes.map((type) => (
                <span
                  key={type}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted/40 px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:border-foreground/30"
                >
                  <span>{type}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveDocType(type)}
                    className="text-muted-foreground hover:text-destructive transition-colors p-0.5"
                    title={`Remove ${type}`}
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Add */}
          <form
            onSubmit={handleAddDocType}
            className="flex gap-2 pt-2 border-t border-border"
          >
            <div className="flex-1">
              <Input
                placeholder="e.g. PET_VACCINATION, LEASE_AGREEMENT, AADHAAR_CARD"
                value={newDocType}
                onChange={(e) => setNewDocType(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
            <Button
              type="submit"
              size="sm"
              className="h-9 shadow-none gap-1.5 text-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              Add type
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* 2. General Preferences */}
      <form onSubmit={handleSaveGeneralPreferences}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Currency & Region */}
          <Card className="rounded-xl border border-border shadow-none">
            <CardHeader className="border-b border-border pb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Coins className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-base font-semibold">
                    Currency &amp; region
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Choose the currency used for bills, expenses, and timeline
                    badges.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-5 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="currency" className={lbl}>
                  Default currency
                </Label>
                <select
                  id="currency"
                  value={config.currency}
                  onChange={(e) => {
                    const sel = CURRENCIES.find(
                      (c) => c.code === e.target.value,
                    );
                    setConfig((prev) => ({
                      ...prev,
                      currency: e.target.value,
                      currencySymbol: sel?.symbol ?? prev.currencySymbol,
                    }));
                  }}
                  className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground transition-colors focus-visible:outline-none focus-visible:border-foreground/40 focus-visible:ring-1 focus-visible:ring-foreground/20"
                >
                  {CURRENCIES.map((curr) => (
                    <option key={curr.code} value={curr.code}>
                      {curr.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="timezone" className={lbl}>
                  Household timezone
                </Label>
                <select
                  id="timezone"
                  value={config.timezone}
                  onChange={(e) =>
                    setConfig((prev) => ({ ...prev, timezone: e.target.value }))
                  }
                  className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground transition-colors focus-visible:outline-none focus-visible:border-foreground/40 focus-visible:ring-1 focus-visible:ring-foreground/20"
                >
                  {TIMEZONES.map((tz) => (
                    <option key={tz} value={tz}>
                      {tz}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="priority" className={lbl}>
                  Default task priority
                </Label>
                <select
                  id="priority"
                  value={config.defaultTaskPriority}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      defaultTaskPriority: e.target.value,
                    }))
                  }
                  className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground transition-colors focus-visible:outline-none focus-visible:border-foreground/40 focus-visible:ring-1 focus-visible:ring-foreground/20"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>
            </CardContent>
          </Card>

          {/* Reminders & Schedule */}
          <Card className="rounded-xl border border-border shadow-none">
            <CardHeader className="border-b border-border pb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Bell className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-base font-semibold">
                    Reminders &amp; digest schedule
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Configure lookahead warnings and daily digest delivery
                    preferences.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-5 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="docDays" className={lbl}>
                  Document expiry warning days
                </Label>
                <DaysChipInput
                  id="docDays"
                  value={config.docReminderDays}
                  onChange={(days) =>
                    setConfig((prev) => ({ ...prev, docReminderDays: days }))
                  }
                  hint="Type a number and press Enter"
                />
                <p className="text-[11px] text-muted-foreground">
                  Alerts trigger when documents enter these days before
                  expiration.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="billDays" className={lbl}>
                  Bill due warning days
                </Label>
                <DaysChipInput
                  id="billDays"
                  value={config.billReminderDays}
                  onChange={(days) =>
                    setConfig((prev) => ({ ...prev, billReminderDays: days }))
                  }
                  hint="Type a number and press Enter"
                />
                <p className="text-[11px] text-muted-foreground">
                  Alerts trigger when bills enter these days before due date.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="digestTime" className={lbl}>
                    Digest time
                  </Label>
                  <Input
                    id="digestTime"
                    type="text"
                    value={config.digestTime}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        digestTime: e.target.value,
                      }))
                    }
                    placeholder="08:00"
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="channel" className={lbl}>
                    Digest channel
                  </Label>
                  <select
                    id="channel"
                    value={config.digestChannel}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        digestChannel: e.target.value,
                      }))
                    }
                    className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground transition-colors focus-visible:outline-none focus-visible:border-foreground/40 focus-visible:ring-1 focus-visible:ring-foreground/20"
                  >
                    <option value="EMAIL">Email</option>
                    <option value="WHATSAPP">WhatsApp</option>
                    <option value="BOTH">Both (Email &amp; WhatsApp)</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-medium text-foreground">
                    Trigger reminders scan
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Check document expiries and bill due dates right now and
                    dispatch any pending notifications.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={runningScan}
                  onClick={handleTriggerScan}
                  className="gap-1.5 text-xs shrink-0"
                >
                  <RefreshCw
                    className={`h-3.5 w-3.5 ${runningScan ? 'animate-spin' : ''}`}
                  />
                  {runningScan ? 'Scanning…' : 'Scan & Notify Now'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="pt-6 flex justify-end">
          <Button
            type="submit"
            disabled={saving}
            className="shadow-none gap-2 px-6"
          >
            <Check className="h-4 w-4" />
            {saving ? 'Saving…' : 'Save preferences'}
          </Button>
        </div>
      </form>
    </div>
  );
}
