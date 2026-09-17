'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button, Input, Label } from '@cairn/ui';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import {
  Eye,
  EyeOff,
  Loader2,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

import { ApiError } from '../../lib/api-error';
import { browserApiFetch } from '../../lib/api-client-browser';

const resetPasswordSchema = z
  .object({
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(8, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export function ResetPasswordForm({ token }: { token?: string | undefined }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resetComplete, setResetComplete] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
  });

  if (!token) {
    return (
      <div className="w-full space-y-6">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
          <AlertCircle className="h-6 w-6" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Invalid reset link
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            This password reset link appears to be missing a valid security
            token or has expired.
          </p>
        </div>

        <div className="pt-2">
          <Link
            href="/forgot-password"
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary font-medium text-sm text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <span>Request a new reset link</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  if (resetComplete) {
    return (
      <div className="w-full space-y-6">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-success/10 text-success">
          <CheckCircle2 className="h-6 w-6" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Password updated
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Your password has been changed successfully. You can now log in with
            your new credentials.
          </p>
        </div>

        <div className="pt-2">
          <Button
            type="button"
            onClick={() => router.push('/login')}
            className="h-10 w-full rounded-lg bg-primary font-medium text-primary-foreground shadow-none hover:bg-primary/90"
          >
            <span>Continue to log in</span>
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  const onSubmit = handleSubmit(async (values) => {
    setSubmitting(true);
    try {
      await browserApiFetch('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          token,
          password: values.password,
        }),
      });
      setResetComplete(true);
      toast.success('Password reset successfully');
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : 'Failed to reset password',
      );
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <div className="w-full">
      <div className="mb-6 space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Set new password
        </h1>
        <p className="text-sm text-muted-foreground">
          Choose a strong password with at least 8 characters.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label
              htmlFor="password"
              className="text-xs font-medium text-foreground/80"
            >
              New password
            </Label>
            <span className="text-[11px] text-muted-foreground">
              Min. 8 characters
            </span>
          </div>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              autoComplete="new-password"
              className="h-10 rounded-lg border-border bg-white dark:bg-stone-900 px-3 pr-10 text-sm text-foreground shadow-none placeholder:text-muted-foreground/50 focus-visible:border-foreground/60 focus-visible:ring-1 focus-visible:ring-foreground/20"
              {...register('password')}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/70 transition-colors hover:text-foreground focus:outline-none"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
          {errors.password && (
            <p className="text-xs font-medium text-destructive">
              {errors.password.message}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label
            htmlFor="confirmPassword"
            className="text-xs font-medium text-foreground/80"
          >
            Confirm new password
          </Label>
          <div className="relative">
            <Input
              id="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder="••••••••"
              autoComplete="new-password"
              className="h-10 rounded-lg border-border bg-white dark:bg-stone-900 px-3 pr-10 text-sm text-foreground shadow-none placeholder:text-muted-foreground/50 focus-visible:border-foreground/60 focus-visible:ring-1 focus-visible:ring-foreground/20"
              {...register('confirmPassword')}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/70 transition-colors hover:text-foreground focus:outline-none"
              aria-label={
                showConfirmPassword ? 'Hide password' : 'Show password'
              }
            >
              {showConfirmPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="text-xs font-medium text-destructive">
              {errors.confirmPassword.message}
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
              <span>Updating password...</span>
            </>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <span>Update password</span>
              <ArrowRight className="h-4 w-4" />
            </span>
          )}
        </Button>
      </form>
    </div>
  );
}
