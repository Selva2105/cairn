'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@cairn/ui';

import { ApiError } from '../../lib/api-error';
import { browserApiFetch } from '../../lib/api-client-browser';

type PreviewState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; householdName: string };

export function JoinInviteCard({ token }: { token: string | undefined }) {
  const router = useRouter();
  const [preview, setPreview] = useState<PreviewState>({ status: 'loading' });
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (!token) {
      setPreview({
        status: 'error',
        message: 'This invite link is missing its token.',
      });
      return;
    }
    browserApiFetch<{ householdName: string }>(
      `/households/invite/${encodeURIComponent(token)}`,
    )
      .then(({ householdName }) =>
        setPreview({ status: 'ready', householdName }),
      )
      .catch((error) =>
        setPreview({
          status: 'error',
          message:
            error instanceof ApiError
              ? error.message
              : 'This invite link is invalid or has expired.',
        }),
      );
  }, [token]);

  const acceptInvite = async () => {
    if (!token) return;
    setJoining(true);
    try {
      await browserApiFetch('/households/join', {
        method: 'POST',
        body: JSON.stringify({ token }),
      });
      router.push('/dashboard/overview');
      router.refresh();
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        router.push(
          `/login?from=${encodeURIComponent(`/join?token=${token}`)}`,
        );
        return;
      }
      setPreview({
        status: 'error',
        message:
          error instanceof ApiError
            ? error.message
            : 'Failed to join household',
      });
    } finally {
      setJoining(false);
    }
  };

  return (
    <Card variant="floating" className="w-full">
      <CardHeader className="space-y-1 pb-4">
        <CardTitle className="text-2xl font-bold tracking-tight">
          Household invite
        </CardTitle>
        {preview.status === 'ready' && (
          <CardDescription className="text-sm">
            You've been invited to join{' '}
            <strong className="text-foreground font-semibold">
              {preview.householdName}
            </strong>
            .
          </CardDescription>
        )}
        {preview.status === 'loading' && (
          <div className="flex items-center gap-2 pt-1 text-sm text-muted-foreground animate-pulse">
            <div className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            <span>Checking your invite...</span>
          </div>
        )}
        {preview.status === 'error' && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
            {preview.message}
          </div>
        )}
      </CardHeader>
      {preview.status === 'ready' && (
        <>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Accepting adds you as a member -- you'll see its documents, bills,
              and maintenance reminders alongside your own.
            </p>

            {/* Direct Google SSO button with invite token */}
            <a
              href={`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000/api'}/auth/google?token=${encodeURIComponent(token!)}`}
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
              <span>Join with Google</span>
            </a>

            <div className="relative my-2 flex items-center justify-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <span className="relative bg-card px-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Or join with password account
              </span>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-3 pt-0">
            <Button
              onClick={acceptInvite}
              disabled={joining}
              variant="outline"
              className="w-full"
            >
              {joining ? 'Joining...' : `Accept with current session`}
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              Prefer password?{' '}
              <Link
                href={`/signup?from=${encodeURIComponent(`/join?token=${token}`)}`}
                className="text-primary hover:underline font-medium"
              >
                Create account
              </Link>{' '}
              or{' '}
              <Link
                href={`/login?from=${encodeURIComponent(`/join?token=${token}`)}`}
                className="text-primary hover:underline font-medium"
              >
                log in
              </Link>
            </p>
          </CardFooter>
        </>
      )}
    </Card>
  );
}
