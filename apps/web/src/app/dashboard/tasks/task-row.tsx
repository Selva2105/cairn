'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge, Button } from '@cairn/ui';
import { CheckCircle2, Clock, RotateCcw, Trash2, X } from 'lucide-react';

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

interface ConfirmationState {
  type: 'status' | 'delete';
  targetStatus?: TaskStatus;
}

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
  const [confirmation, setConfirmation] = useState<ConfirmationState | null>(
    null,
  );

  // Close confirmation modal on Escape key
  useEffect(() => {
    if (!confirmation) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setConfirmation(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [confirmation]);

  const handleStatusBadgeClick = () => {
    const target = NEXT_STATUS[status];
    setConfirmation({ type: 'status', targetStatus: target });
  };

  const handleDeleteClick = () => {
    setConfirmation({ type: 'delete' });
  };

  const executeStatusChange = async (targetStatus: TaskStatus) => {
    setBusy(true);
    try {
      await browserApiFetch(`/households/${householdId}/tasks/${taskId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: targetStatus }),
      });
      const label =
        targetStatus === 'DONE'
          ? 'Task marked as completed'
          : targetStatus === 'IN_PROGRESS'
            ? 'Task moved to In Progress'
            : 'Task reopened';
      toast.success(label);
      setConfirmation(null);
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : 'Failed to update task',
      );
    } finally {
      setBusy(false);
    }
  };

  const executeDelete = async () => {
    setBusy(true);
    try {
      await browserApiFetch(`/households/${householdId}/tasks/${taskId}`, {
        method: 'DELETE',
      });
      toast.success('Task deleted');
      setConfirmation(null);
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
    <>
      <li className="group flex items-center justify-between rounded-xl border border-border bg-card p-3.5 transition-colors duration-150 hover:border-border/80 hover:bg-muted/30">
        <p
          className={`text-sm transition-all duration-200 ${
            status === 'DONE'
              ? 'line-through text-muted-foreground/70'
              : 'text-foreground font-medium'
          }`}
        >
          {description}
        </p>
        <div className="flex items-center gap-2 shrink-0">
          <Badge
            variant={STATUS_VARIANT[status]}
            className="cursor-pointer transition-transform hover:scale-105 active:scale-95 select-none"
            onClick={busy ? undefined : handleStatusBadgeClick}
            title={`Click to change status to ${NEXT_STATUS[status].replace('_', ' ')}`}
          >
            {status.replace('_', ' ')}
          </Badge>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={busy}
            onClick={handleDeleteClick}
            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            title="Delete task"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span className="sr-only">Delete</span>
          </Button>
        </div>
      </li>

      {/* Confirmation Dialog */}
      {confirmation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => !busy && setConfirmation(null)}
          />

          {/* Modal Container */}
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-none flex flex-col gap-4 animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                {confirmation.type === 'delete' ? (
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </div>
                ) : confirmation.targetStatus === 'DONE' ? (
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                ) : confirmation.targetStatus === 'IN_PROGRESS' ? (
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Clock className="h-4 w-4" />
                  </div>
                ) : (
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                    <RotateCcw className="h-4 w-4" />
                  </div>
                )}
                <div>
                  <h3 className="text-base font-semibold text-foreground">
                    {confirmation.type === 'delete'
                      ? 'Delete this task?'
                      : confirmation.targetStatus === 'DONE'
                        ? 'Complete this task?'
                        : confirmation.targetStatus === 'IN_PROGRESS'
                          ? 'Start work on task?'
                          : 'Reopen this task?'}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {confirmation.type === 'delete'
                      ? 'This action cannot be undone.'
                      : confirmation.targetStatus === 'DONE'
                        ? 'Mark this duty as resolved for your household.'
                        : confirmation.targetStatus === 'IN_PROGRESS'
                          ? 'Let household members know progress is underway.'
                          : 'Place this duty back on the open duties board.'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => !busy && setConfirmation(null)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Task Preview Card */}
            <div className="rounded-xl border border-border bg-muted/30 p-3">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                Task
              </span>
              <p className="text-xs font-medium text-foreground">
                {description}
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-1">
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => setConfirmation(null)}
                className="text-xs h-9 px-3.5"
              >
                Cancel
              </Button>
              {confirmation.type === 'delete' ? (
                <Button
                  type="button"
                  variant="destructive"
                  disabled={busy}
                  onClick={executeDelete}
                  className="text-xs h-9 px-4"
                >
                  {busy ? 'Deleting...' : 'Delete permanently'}
                </Button>
              ) : (
                <Button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    confirmation.targetStatus &&
                    executeStatusChange(confirmation.targetStatus)
                  }
                  className="text-xs h-9 px-4"
                >
                  {busy
                    ? 'Updating...'
                    : confirmation.targetStatus === 'DONE'
                      ? 'Mark as Done'
                      : confirmation.targetStatus === 'IN_PROGRESS'
                        ? 'Move to In Progress'
                        : 'Reopen Task'}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
