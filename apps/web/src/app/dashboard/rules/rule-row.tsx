'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge, Button } from '@cairn/ui';
import { Sliders, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { ApiError } from '../../../lib/api-error';
import { browserApiFetch } from '../../../lib/api-client-browser';

export function RuleRow({
  householdId,
  ruleId,
  name,
  isActive,
}: {
  householdId: string;
  ruleId: string;
  name: string;
  isActive: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const remove = async () => {
    setBusy(true);
    try {
      await browserApiFetch(`/households/${householdId}/rules/${ruleId}`, {
        method: 'DELETE',
      });
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : 'Failed to delete rule',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <li className="group flex items-center justify-between rounded-xl border border-border bg-card p-3.5 transition-colors duration-150 hover:border-border/80 hover:bg-muted/30">
      <div className="flex items-center gap-3">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
          <Sliders className="h-3.5 w-3.5" />
        </div>
        <p className="text-sm font-medium text-foreground">{name}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Badge variant={isActive ? 'success' : 'secondary'}>
          {isActive ? 'Active' : 'Inactive'}
        </Badge>
        <Button
          variant="ghost"
          size="sm"
          disabled={busy}
          onClick={remove}
          className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          title="Delete rule"
        >
          <Trash2 className="h-3.5 w-3.5" />
          <span className="sr-only">Delete</span>
        </Button>
      </div>
    </li>
  );
}
