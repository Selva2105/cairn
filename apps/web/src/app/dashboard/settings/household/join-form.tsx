'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input, Label } from '@cairn/ui';
import { toast } from 'sonner';

import { ApiError } from '../../../../lib/api-error';
import { browserApiFetch } from '../../../../lib/api-client-browser';

import { KeyRound } from 'lucide-react';

export function JoinForm() {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      await browserApiFetch('/households/join', {
        method: 'POST',
        body: JSON.stringify({ token }),
      });
      toast.success('Joined household');
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : 'Failed to join household',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3"
    >
      <div className="flex-1 space-y-1.5">
        <Label
          htmlFor="token"
          className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
        >
          Invite token
        </Label>
        <Input
          id="token"
          placeholder="e.g. inv_8f93b2a..."
          value={token}
          onChange={(event) => setToken(event.target.value)}
          className="font-mono text-xs"
        />
      </div>
      <Button
        type="submit"
        disabled={submitting || !token}
        className="shrink-0"
      >
        <KeyRound className="mr-1.5 h-4 w-4" />
        {submitting ? 'Joining...' : 'Join household'}
      </Button>
    </form>
  );
}
