'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@cairn/ui';
import { RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

import { ApiError } from '../../../lib/api-error';
import { browserApiFetch } from '../../../lib/api-client-browser';

interface RunSummary {
  ingested: number;
  notified: number;
  queuedForReview: number;
  failedConnectors: number;
}

export function RunNowButton({ householdId }: { householdId: string }) {
  const router = useRouter();
  const [running, setRunning] = useState(false);

  const run = async () => {
    setRunning(true);
    try {
      const summary = await browserApiFetch<RunSummary>(
        `/households/${householdId}/pipeline/run`,
        { method: 'POST' },
      );
      toast.success(
        `Check complete: ${summary.ingested} new finds, ${summary.notified} alerts sent, ${summary.queuedForReview} awaiting your review`,
      );
      if (summary.failedConnectors > 0) {
        toast.warning(
          `${summary.failedConnectors} connected account(s) couldn't be read -- check Integrations`,
        );
      }
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : 'The check failed to run',
      );
    } finally {
      setRunning(false);
    }
  };

  return (
    <Button
      size="sm"
      variant="outline"
      className="gap-1.5 text-xs"
      disabled={running}
      onClick={run}
      title="Scan documents, bills and connected accounts now, and send any alerts that are due"
    >
      <RefreshCw className={`h-3.5 w-3.5 ${running ? 'animate-spin' : ''}`} />
      <span>{running ? 'Checking...' : 'Run check now'}</span>
    </Button>
  );
}
