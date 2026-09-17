'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button, Input, Label } from '@cairn/ui';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { Mail, CheckCircle2, Loader2, ArrowLeft } from 'lucide-react';

import { ApiError } from '../../lib/api-error';
import { browserApiFetch } from '../../lib/api-client-browser';

const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export function ForgotPasswordForm() {
  const [submitting, setSubmitting] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = handleSubmit(async (values) => {
    setSubmitting(true);
    try {
      await browserApiFetch('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify(values),
      });
      setSubmittedEmail(values.email);
    } catch (error) {
      toast.error(
        error instanceof ApiError
          ? error.message
          : 'Failed to request password reset',
      );
    } finally {
      setSubmitting(false);
    }
  });

  if (submittedEmail) {
    return (
      <div className="w-full space-y-6">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-success/10 text-success">
          <CheckCircle2 className="h-6 w-6" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Check your email
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            If an account exists for{' '}
            <span className="font-semibold text-foreground">
              {submittedEmail}
            </span>
            , we&apos;ve sent a password reset link. Please check your inbox and
            spam folder.
          </p>
        </div>

        <div className="pt-2">
          <Link
            href="/login"
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary font-medium text-sm text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Return to log in</span>
          </Link>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Didn&apos;t receive an email?{' '}
          <button
            type="button"
            onClick={() => setSubmittedEmail(null)}
            className="font-medium text-primary hover:underline underline-offset-4"
          >
            Try another address
          </button>
        </p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="mb-6 space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Reset password
        </h1>
        <p className="text-sm text-muted-foreground">
          Enter the email associated with your household account to receive a
          reset link.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label
            htmlFor="email"
            className="text-xs font-medium text-foreground/80"
          >
            Email address
          </Label>
          <div className="relative">
            <Input
              id="email"
              type="email"
              placeholder="alex@cairnhome.com"
              autoComplete="email"
              className="h-10 rounded-lg border-border bg-white dark:bg-stone-900 px-3 text-sm text-foreground shadow-none placeholder:text-muted-foreground/50 focus-visible:border-foreground/60 focus-visible:ring-1 focus-visible:ring-foreground/20"
              {...register('email')}
            />
          </div>
          {errors.email && (
            <p className="text-xs font-medium text-destructive">
              {errors.email.message}
            </p>
          )}
        </div>

        <Button
          type="submit"
          disabled={submitting}
          className="mt-2 h-10 w-full rounded-lg bg-primary font-medium text-primary-foreground shadow-none hover:bg-primary/90"
        >
          {submitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              <span>Sending reset link...</span>
            </>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <Mail className="h-4 w-4" />
              <span>Send reset instructions</span>
            </span>
          )}
        </Button>
      </form>

      <div className="mt-6 text-center">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to log in</span>
        </Link>
      </div>
    </div>
  );
}
