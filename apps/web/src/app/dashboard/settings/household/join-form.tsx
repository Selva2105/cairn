'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input, Label } from '@cairn/ui';
import { toast } from 'sonner';

import { ApiError } from '../../../../lib/api-error';
import { browserApiFetch } from '../../../../lib/api-client-browser';

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
    <form onSubmit={onSubmit} className="flex items-end gap-3">
      <div className="space-y-2">
        <Label htmlFor="token">Invite token</Label>
        <Input
          id="token"
          value={token}
          onChange={(event) => setToken(event.target.value)}
        />
      </div>
      <Button type="submit" disabled={submitting || !token}>
        {submitting ? 'Joining...' : 'Join household'}
      </Button>
    </form>
  );
}
