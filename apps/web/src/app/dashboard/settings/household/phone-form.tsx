'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Label } from '@cairn/ui';
import { MessageSquare } from 'lucide-react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { ApiError } from '../../../../lib/api-error';
import { browserApiFetch } from '../../../../lib/api-client-browser';
import { CountryPhoneInput } from '../../../../components/country-phone-input';

const phoneSchema = z.object({
  phone: z
    .string()
    .regex(
      /^\+[1-9]\d{7,14}$/,
      'Select country and enter a valid phone number (e.g. +14155552671)',
    ),
});

type PhoneInputType = z.infer<typeof phoneSchema>;

export function PhoneForm({ currentPhone }: { currentPhone: string | null }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<PhoneInputType>({
    resolver: zodResolver(phoneSchema),
    defaultValues: { phone: currentPhone ?? '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setSubmitting(true);
    try {
      await browserApiFetch('/users/me/phone', {
        method: 'PATCH',
        body: JSON.stringify(values),
      });
      toast.success('WhatsApp number saved');
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof ApiError
          ? error.message
          : 'Failed to save phone number',
      );
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <div className="flex flex-col gap-3">
      {currentPhone ? (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-2.5 text-xs text-emerald-600 dark:text-emerald-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          <span>
            Active phone link:{' '}
            <strong className="font-mono">{currentPhone}</strong>
          </span>
        </div>
      ) : (
        <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 p-2.5 text-xs text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
          <span>
            No phone linked. Save your WhatsApp number below to enable assistant
            features.
          </span>
        </div>
      )}

      <form onSubmit={onSubmit} className="flex flex-col gap-2">
        <div className="space-y-1.5">
          <Label
            htmlFor="phone"
            className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
          >
            WhatsApp number
          </Label>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="flex-1">
              <Controller
                control={control}
                name="phone"
                render={({ field: { value, onChange } }) => (
                  <CountryPhoneInput
                    id="phone"
                    value={value}
                    onChange={(val) => onChange(val ?? '')}
                    disabled={submitting}
                  />
                )}
              />
            </div>
            <Button type="submit" disabled={submitting} className="shrink-0">
              <MessageSquare className="mr-1.5 h-4 w-4" />
              {submitting ? 'Saving...' : 'Save number'}
            </Button>
          </div>
          {errors.phone ? (
            <p className="text-xs font-medium text-destructive">
              {errors.phone.message}
            </p>
          ) : (
            <p className="text-[11px] text-muted-foreground">
              Select country code and enter your number (saved as international
              format, e.g. +14155552671).
            </p>
          )}
        </div>
      </form>
    </div>
  );
}
