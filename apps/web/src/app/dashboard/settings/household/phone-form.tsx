'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input, Label } from '@cairn/ui';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { ApiError } from '../../../../lib/api-error';
import { browserApiFetch } from '../../../../lib/api-client-browser';

const phoneSchema = z.object({
  phone: z
    .string()
    .regex(/^\+[1-9]\d{7,14}$/, 'Use E.164 format, e.g. +14155552671'),
});

type PhoneInput = z.infer<typeof phoneSchema>;

export function PhoneForm({ currentPhone }: { currentPhone: string | null }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PhoneInput>({
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
    <form onSubmit={onSubmit} className="flex items-end gap-3">
      <div className="space-y-2">
        <Label htmlFor="phone">WhatsApp number</Label>
        <Input id="phone" placeholder="+14155552671" {...register('phone')} />
        {errors.phone && (
          <p className="text-sm text-destructive">{errors.phone.message}</p>
        )}
      </div>
      <Button type="submit" disabled={submitting}>
        {submitting ? 'Saving...' : 'Save'}
      </Button>
    </form>
  );
}
