'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input } from '@cairn/ui';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';

import { ApiError } from '../../../lib/api-error';
import { browserApiFetch } from '../../../lib/api-client-browser';

export function TaskForm({ householdId }: { householdId: string }) {
  const router = useRouter();
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!description.trim()) return;
    setSubmitting(true);
    try {
      await browserApiFetch(`/households/${householdId}/tasks`, {
        method: 'POST',
        body: JSON.stringify({ description }),
      });
      setDescription('');
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : 'Failed to add task',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3"
    >
      <div className="relative flex-1">
        <Input
          placeholder="What needs doing? (e.g. Schedule chimney inspection)"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          className="pr-4"
        />
      </div>
      <Button
        type="submit"
        disabled={submitting || !description.trim()}
        className="shrink-0"
      >
        <Plus className="mr-1.5 h-4 w-4" />
        {submitting ? 'Adding...' : 'Add task'}
      </Button>
    </form>
  );
}
