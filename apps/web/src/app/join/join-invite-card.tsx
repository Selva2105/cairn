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
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Household invite</CardTitle>
        {preview.status === 'ready' && (
          <CardDescription>
            You've been invited to join <strong>{preview.householdName}</strong>
            .
          </CardDescription>
        )}
        {preview.status === 'loading' && (
          <CardDescription>Checking your invite...</CardDescription>
        )}
        {preview.status === 'error' && (
          <CardDescription className="text-destructive">
            {preview.message}
          </CardDescription>
        )}
      </CardHeader>
      {preview.status === 'ready' && (
        <>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Accepting adds you as a member -- you'll see its documents, bills,
              and maintenance reminders alongside your own.
            </p>
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Button
              onClick={acceptInvite}
              disabled={joining}
              className="w-full"
            >
              {joining ? 'Joining...' : `Accept invite`}
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              Not signed in yet?{' '}
              <Link
                href={`/signup?from=${encodeURIComponent(`/join?token=${token}`)}`}
                className="text-primary hover:underline"
              >
                Create an account
              </Link>{' '}
              or{' '}
              <Link
                href={`/login?from=${encodeURIComponent(`/join?token=${token}`)}`}
                className="text-primary hover:underline"
              >
                log in
              </Link>{' '}
              first, then come back to this link.
            </p>
          </CardFooter>
        </>
      )}
    </Card>
  );
}
