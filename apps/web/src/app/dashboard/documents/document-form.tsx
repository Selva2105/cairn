'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, DateTimePicker, Input, Label } from '@cairn/ui';
import { FilePlus } from 'lucide-react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { ApiError } from '../../../lib/api-error';
import { browserApiFetch } from '../../../lib/api-client-browser';

const documentSchema = z.object({
  type: z.string().min(1, 'Document type is required'),
  label: z.string().min(1, 'Label is required').max(120),
  expiresOn: z.date({ message: 'Expiry date and time are required' }),
  notes: z.string().max(500).optional(),
});

type DocumentInput = z.infer<typeof documentSchema>;

export function DocumentForm({
  householdId,
  documentTypes,
}: {
  householdId: string;
  documentTypes: string[];
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<DocumentInput>({
    resolver: zodResolver(documentSchema),
    defaultValues: { type: documentTypes[0] ?? 'OTHER' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setSubmitting(true);
    try {
      await browserApiFetch(`/households/${householdId}/documents`, {
        method: 'POST',
        body: JSON.stringify({
          ...values,
          expiresOn: values.expiresOn.toISOString(),
        }),
      });
      toast.success('Document added');
      reset();
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : 'Failed to add document',
      );
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col gap-5 rounded-xl border border-border bg-card p-5 sm:p-6"
    >
      <div className="flex items-center gap-2.5 pb-1 border-b border-border">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <FilePlus className="h-4 w-4" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-foreground">
            Add new document
          </h2>
          <p className="text-xs text-muted-foreground">
            Keep tabs on renewals, warranties, and registrations
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="type" className="text-sm font-medium">
            Document type
          </Label>
          <select
            id="type"
            className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground transition-colors focus-visible:outline-none focus-visible:border-foreground/40 focus-visible:ring-1 focus-visible:ring-foreground/20"
            {...register('type')}
          >
            {documentTypes.map((type) => (
              <option
                key={type}
                value={type}
                className="bg-popover text-popover-foreground"
              >
                {type.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="expiresOn" className="text-sm font-medium">
            Expires on
          </Label>
          <Controller
            name="expiresOn"
            control={control}
            render={({ field }) => (
              <DateTimePicker value={field.value} onChange={field.onChange} />
            )}
          />
          {errors.expiresOn && (
            <p className="text-xs font-medium text-destructive">
              {errors.expiresOn.message}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="label" className="text-sm font-medium">
            Label
          </Label>
          <Input
            id="label"
            placeholder="e.g. Passport, Home Insurance"
            {...register('label')}
          />
          {errors.label && (
            <p className="text-xs font-medium text-destructive">
              {errors.label.message}
            </p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="notes" className="text-sm font-medium">
            Notes (optional)
          </Label>
          <Input
            id="notes"
            placeholder="Policy #, renewal link, or notes"
            {...register('notes')}
          />
        </div>
      </div>

      <div className="pt-2">
        <Button type="submit" disabled={submitting} className="self-start">
          {submitting ? 'Adding...' : 'Add document'}
        </Button>
      </div>
    </form>
  );
}
