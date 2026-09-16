'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@cairn/ui';
import { toast } from 'sonner';

import { ApiError } from '../../../lib/api-error';
import { browserApiFetch } from '../../../lib/api-client-browser';

export function DocumentDeleteButton({
  householdId,
  documentId,
  label,
}: {
  householdId: string;
  documentId: string;
  label: string;
}) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  const remove = async () => {
    if (!window.confirm(`Delete "${label}"? This can't be undone.`)) {
      return;
    }
    setDeleting(true);
    try {
      await browserApiFetch(
        `/households/${householdId}/documents/${documentId}`,
        { method: 'DELETE' },
      );
      toast.success('Document deleted');
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : 'Failed to delete document',
      );
      setDeleting(false);
    }
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={deleting}
      onClick={remove}
      className="self-start text-destructive hover:text-destructive"
    >
      {deleting ? 'Deleting...' : 'Delete'}
    </Button>
  );
}
