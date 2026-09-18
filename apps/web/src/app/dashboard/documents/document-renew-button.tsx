'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, DateTimePicker } from '@cairn/ui';
import { CalendarClock, X } from 'lucide-react';
import { toast } from 'sonner';

import { ApiError } from '../../../lib/api-error';
import { browserApiFetch } from '../../../lib/api-client-browser';

/** Defaults the renewal picker to one year out -- the common case for passports, insurance,
 * registrations, etc. Still fully editable before confirming. */
function oneYearFromNow(): Date {
  const date = new Date();
  date.setFullYear(date.getFullYear() + 1);
  return date;
}

export function DocumentRenewButton({
  householdId,
  documentId,
  label,
}: {
  householdId: string;
  documentId: string;
  label: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [newExpiry, setNewExpiry] = useState<Date | undefined>(
    oneYearFromNow(),
  );
  const [submitting, setSubmitting] = useState(false);

  const renew = async () => {
    if (!newExpiry) return;
    setSubmitting(true);
    try {
      await browserApiFetch(
        `/households/${householdId}/documents/${documentId}`,
        {
          method: 'PATCH',
          body: JSON.stringify({ expiresOn: newExpiry.toISOString() }),
        },
      );
      toast.success('Document renewed');
      router.refresh();
      setOpen(false);
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : 'Failed to renew document',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        className="h-8 gap-1 text-xs text-muted-foreground hover:text-foreground"
        title="Renew: push out the expiry date"
      >
        <CalendarClock className="h-3.5 w-3.5" />
        <span>Renew</span>
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/60 backdrop-blur-md animate-in fade-in-0 duration-150"
          onClick={() => !submitting && setOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-xl border border-border bg-card/95 backdrop-blur-xl p-6 animate-in zoom-in-95 duration-200 flex flex-col gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-semibold text-foreground">
                  Renew "{label}"
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Pick the new expiry date -- everything else stays the same.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <DateTimePicker
              {...(newExpiry ? { value: newExpiry } : {})}
              onChange={setNewExpiry}
            />

            <div className="flex items-center justify-end gap-2.5 pt-1">
              <Button
                type="button"
                variant="outline"
                disabled={submitting}
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={submitting || !newExpiry}
                onClick={renew}
              >
                {submitting ? 'Renewing...' : 'Confirm renewal'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
