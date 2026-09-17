import { Badge } from '@cairn/ui';

import { apiFetch } from '../../../lib/api-client';
import { requireSession } from '../../../lib/session';
import { TasksClient, TaskRowData } from './tasks-client';

export default async function TasksPage() {
  const session = await requireSession();
  const householdId = session.householdId;

  const tasks = await apiFetch<TaskRowData[]>(
    `/households/${householdId}/tasks`,
  );

  return (
    <div className="flex flex-col gap-8 pb-10">
      {/* Header section */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Tasks & Chores
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Shared responsibilities, maintenance duties, recurring upkeep, and
            quick to-dos.
          </p>
        </div>
        <Badge
          variant="secondary"
          className="font-mono text-xs hidden sm:inline-flex"
        >
          {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}
        </Badge>
      </div>

      <TasksClient tasks={tasks} householdId={householdId} />
    </div>
  );
}
