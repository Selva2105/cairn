'use client';

import { useState } from 'react';
import { Button, Input } from '@cairn/ui';
import { toast } from 'sonner';

import { ApiError } from '../../../../lib/api-error';
import { browserApiFetch } from '../../../../lib/api-client-browser';

export function InviteSection({ householdId }: { householdId: string }) {
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  const generate = async () => {
    setGenerating(true);
    try {
      const { inviteToken: token } = await browserApiFetch<{
        inviteToken: string;
      }>(`/households/${householdId}/invite`, { method: 'POST' });
      setInviteToken(token);
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : 'Failed to create invite',
      );
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <Button onClick={generate} disabled={generating} className="self-start">
        {generating ? 'Generating...' : 'Generate invite link'}
      </Button>
      {inviteToken && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Share this token -- valid for 7 days. A new member pastes it on the
            join screen after signing up.
          </p>
          <Input
            readOnly
            value={inviteToken}
            onFocus={(event) => event.currentTarget.select()}
          />
        </div>
      )}
    </div>
  );
}
