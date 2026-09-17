'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button, Input, Label } from '@cairn/ui';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { AlertCircle, Eye, EyeOff, Loader2, ArrowRight } from 'lucide-react';

import { ApiError } from '../../lib/api-error';
import { browserApiFetch } from '../../lib/api-client-browser';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginInput = z.infer<typeof loginSchema>;

export function LoginForm({
  redirectTo,
  ssoError = false,
}: {
  redirectTo: string;
  ssoError?: boolean;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const apiBase =
    process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000/api';

  let googleAuthUrl = `${apiBase}/auth/google`;
  if (redirectTo && redirectTo !== '/dashboard/overview') {
    const params = new URLSearchParams();
    params.set('from', redirectTo);
    try {
      const parsedUrl = new URL(redirectTo, 'http://localhost');
      const token = parsedUrl.searchParams.get('token');
      if (token) {
        params.set('token', token);
      }
    } catch {
      // ignore
    }
    googleAuthUrl = `${apiBase}/auth/google?${params.toString()}`;
  }

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  const onSubmit = handleSubmit(async (values) => {
    setSubmitting(true);
    try {
      await browserApiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify(values),
      });
      router.push(redirectTo);
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof ApiError
          ? error.message
          : 'Login failed. Please check credentials.',
      );
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <div className="w-full">
      <div className="mb-6 space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Log in
        </h1>
        <p className="text-sm text-muted-foreground">
          Welcome back to your household operations hub.
        </p>
      </div>

      {ssoError && (
        <div className="mb-5 flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>
            Google sign-in was cancelled or encountered an error. Please try
            again or use your password.
          </span>
        </div>
      )}

      {/* Google OAuth Direct CTA */}
      <a
        href={googleAuthUrl}
        className="group relative flex h-10 w-full items-center justify-center gap-2.5 rounded-lg border border-border bg-white dark:bg-stone-900 px-4 text-sm font-medium text-foreground transition-colors hover:bg-stone-50 dark:hover:bg-stone-850"
      >
        <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
          />
        </svg>
        <span>Continue with Google</span>
      </a>

      <div className="relative my-6 flex items-center justify-center">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <span className="relative bg-background px-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Or continue with email
        </span>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label
            htmlFor="email"
            className="text-xs font-medium text-foreground/80"
          >
            Email address
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="alex@cairnhome.com"
            autoComplete="email"
            className="h-10 rounded-lg border-border bg-white dark:bg-stone-900 px-3 text-sm text-foreground shadow-none placeholder:text-muted-foreground/50 focus-visible:border-foreground/60 focus-visible:ring-1 focus-visible:ring-foreground/20"
            {...register('email')}
          />
          {errors.email && (
            <p className="text-xs font-medium text-destructive">
              {errors.email.message}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label
              htmlFor="password"
              className="text-xs font-medium text-foreground/80"
            >
              Password
            </Label>
            <Link
              href="/forgot-password"
              className="text-xs font-medium text-primary hover:underline underline-offset-4"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              autoComplete="current-password"
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

        <Button
          type="submit"
          disabled={submitting}
          className="mt-2 h-10 w-full rounded-lg bg-primary font-medium text-primary-foreground shadow-none hover:bg-primary/90"
        >
          {submitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              <span>Logging in...</span>
            </>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <span>Log in</span>
              <ArrowRight className="h-4 w-4" />
            </span>
          )}
        </Button>
      </form>
    </div>
  );
}
