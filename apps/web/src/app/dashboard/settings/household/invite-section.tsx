'use client';

import { useState } from 'react';
import { Button, Input, Label } from '@cairn/ui';
import { Check, Copy, Link2, Mail } from 'lucide-react';
import { toast } from 'sonner';

import { ApiError } from '../../../../lib/api-error';
import { browserApiFetch } from '../../../../lib/api-client-browser';

export function InviteSection({ householdId }: { householdId: string }) {
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
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
      setCopied(true);
      toast.success('Invite link copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
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
      <form
        onSubmit={sendEmailInvite}
        className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3"
      >
        <div className="flex-1 space-y-1.5">
          <Label
            htmlFor="invite-email"
            className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
          >
            Invite by email
          </Label>
          <Input
            id="invite-email"
            type="email"
            placeholder="member@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </div>
        <Button type="submit" disabled={sending || !email} className="shrink-0">
          <Mail className="mr-1.5 h-4 w-4" />
          {sending ? 'Sending...' : 'Send invite'}
        </Button>
      </form>

      <div className="flex flex-col gap-3.5 border-t border-border/50 pt-5">
        <div className="flex flex-col gap-0.5">
          <p className="text-sm font-medium text-foreground">
            Direct invite link
          </p>
          <p className="text-xs text-muted-foreground">
            Generate a shareable link to send via text or messaging app (valid
            for 7 days).
          </p>
        </div>

        {!inviteUrl ? (
          <Button
            type="button"
            variant="outline"
            onClick={generateLink}
            disabled={generating}
            className="self-start"
          >
            <Link2 className="mr-1.5 h-4 w-4" />
            {generating ? 'Generating...' : 'Generate link'}
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            <Input
              readOnly
              value={inviteUrl}
              onFocus={(event) => event.currentTarget.select()}
              className="font-mono text-xs"
            />
            <Button
              type="button"
              variant="secondary"
              onClick={copyLink}
              className="shrink-0"
            >
              {copied ? (
                <>
                  <Check className="mr-1.5 h-4 w-4 text-success" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="mr-1.5 h-4 w-4" />
                  Copy
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
