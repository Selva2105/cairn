'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge, Button } from '@cairn/ui';
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
    <li className="flex items-center justify-between rounded-md border p-3">
      <p className="text-sm">{name}</p>
      <div className="flex items-center gap-2">
        <Badge variant={isActive ? 'success' : 'secondary'}>
          {isActive ? 'Active' : 'Inactive'}
        </Badge>
        <Button variant="ghost" size="sm" disabled={busy} onClick={remove}>
          Delete
        </Button>
      </div>
    </li>
  );
}
