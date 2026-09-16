'use client';

import { useState } from 'react';
import { Button, Input, Label } from '@cairn/ui';
import { toast } from 'sonner';

import { ApiError } from '../../../../lib/api-error';
import { browserApiFetch } from '../../../../lib/api-client-browser';

export function InviteSection({ householdId }: { householdId: string }) {
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);

  const toJoinUrl = (token: string) =>
    `${window.location.origin}/join?token=${encodeURIComponent(token)}`;

  const generateLink = async () => {
    setGenerating(true);
    try {
      const { inviteToken } = await browserApiFetch<{
        inviteToken: string;
      }>(`/households/${householdId}/invite`, { method: 'POST' });
      setInviteUrl(toJoinUrl(inviteToken));
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : 'Failed to create invite',
      );
    } finally {
      setGenerating(false);
    }
  };

  const copyLink = async () => {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      toast.success('Invite link copied');
    } catch {
      toast.error('Could not copy -- select and copy the link manually');
    }
  };

  const sendEmailInvite = async (event: React.FormEvent) => {
    event.preventDefault();
    setSending(true);
    try {
      const { emailSent } = await browserApiFetch<{
        inviteToken: string;
        emailSent: boolean;
      }>(`/households/${householdId}/invite`, {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      if (emailSent) {
        toast.success(`Invite sent to ${email}`);
        setEmail('');
      }
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : 'Failed to send invite',
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={sendEmailInvite} className="flex items-end gap-3">
        <div className="flex-1 space-y-2">
          <Label htmlFor="invite-email">Invite by email</Label>
          <Input
            id="invite-email"
            type="email"
            placeholder="member@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </div>
        <Button type="submit" disabled={sending || !email}>
          {sending ? 'Sending...' : 'Send invite'}
        </Button>
      </form>

      <div className="flex flex-col gap-3 border-t pt-4">
        <p className="text-sm text-muted-foreground">
          Or generate a link to share yourself -- valid for 7 days.
        </p>
        <Button
          type="button"
          variant="outline"
          onClick={generateLink}
          disabled={generating}
          className="self-start"
        >
          {generating ? 'Generating...' : 'Generate invite link'}
        </Button>
        {inviteUrl && (
          <div className="flex items-center gap-2">
            <Input
              readOnly
              value={inviteUrl}
              onFocus={(event) => event.currentTarget.select()}
            />
            <Button type="button" variant="secondary" onClick={copyLink}>
              Copy
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
