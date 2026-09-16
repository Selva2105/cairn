'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input, Label } from '@cairn/ui';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { ApiError } from '../../../lib/api-error';
import { browserApiFetch } from '../../../lib/api-client-browser';

const DOCUMENT_TYPES = [
  'PASSPORT',
  'INSURANCE',
  'WARRANTY',
  'REGISTRATION',
  'OTHER',
] as const;

const documentSchema = z.object({
  type: z.enum(DOCUMENT_TYPES),
  label: z.string().min(1, 'Label is required').max(120),
  expiresOn: z.string().min(1, 'Expiry date and time are required'),
  notes: z.string().max(500).optional(),
});

type DocumentInput = z.infer<typeof documentSchema>;

export function DocumentForm({ householdId }: { householdId: string }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<DocumentInput>({
    resolver: zodResolver(documentSchema),
    defaultValues: { type: 'OTHER' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setSubmitting(true);
    try {
      await browserApiFetch(`/households/${householdId}/documents`, {
        method: 'POST',
        body: JSON.stringify({
          ...values,
          expiresOn: new Date(values.expiresOn).toISOString(),
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
      className="flex flex-col gap-4 rounded-lg border p-4"
    >
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="type">Type</Label>
          <select
            id="type"
            className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
            {...register('type')}
          >
            {DOCUMENT_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="expiresOn">Expires on</Label>
          <Input
            id="expiresOn"
            type="datetime-local"
            {...register('expiresOn')}
          />
          {errors.expiresOn && (
            <p className="text-sm text-destructive">
              {errors.expiresOn.message}
            </p>
          )}
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="label">Label</Label>
        <Input id="label" placeholder="My Passport" {...register('label')} />
        {errors.label && (
          <p className="text-sm text-destructive">{errors.label.message}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="notes">Notes (optional)</Label>
        <Input id="notes" {...register('notes')} />
      </div>
      <Button type="submit" disabled={submitting} className="self-start">
        {submitting ? 'Adding...' : 'Add document'}
      </Button>
    </form>
  );
}
