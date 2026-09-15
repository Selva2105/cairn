'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge, Button } from '@cairn/ui';
import { toast } from 'sonner';

import { ApiError } from '../../../lib/api-error';
import { browserApiFetch } from '../../../lib/api-client-browser';

type TaskStatus = 'OPEN' | 'IN_PROGRESS' | 'DONE';

const NEXT_STATUS: Record<TaskStatus, TaskStatus> = {
  OPEN: 'IN_PROGRESS',
  IN_PROGRESS: 'DONE',
  DONE: 'OPEN',
};

const STATUS_VARIANT: Record<TaskStatus, 'warning' | 'default' | 'success'> = {
  OPEN: 'warning',
  IN_PROGRESS: 'default',
  DONE: 'success',
};

export function TaskRow({
  householdId,
  taskId,
  description,
  status,
}: {
  householdId: string;
  taskId: string;
  description: string;
  status: TaskStatus;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const advanceStatus = async () => {
    setBusy(true);
    try {
      await browserApiFetch(`/households/${householdId}/tasks/${taskId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: NEXT_STATUS[status] }),
      });
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : 'Failed to update task',
      );
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await browserApiFetch(`/households/${householdId}/tasks/${taskId}`, {
        method: 'DELETE',
      });
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : 'Failed to delete task',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <li className="flex items-center justify-between rounded-md border p-3">
      <p className="text-sm">{description}</p>
      <div className="flex items-center gap-2">
        <Badge
          variant={STATUS_VARIANT[status]}
          className="cursor-pointer"
          onClick={busy ? undefined : advanceStatus}
        >
          {status.replace('_', ' ')}
        </Badge>
        <Button variant="ghost" size="sm" disabled={busy} onClick={remove}>
          Delete
        </Button>
      </div>
    </li>
  );
}
