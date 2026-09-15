import { Card, CardContent, CardHeader, CardTitle } from '@cairn/ui';

import { apiFetch } from '../../../lib/api-client';
import { requireSession } from '../../../lib/session';
import { TaskForm } from './task-form';
import { TaskRow } from './task-row';

interface TaskRowData {
  id: string;
  description: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'DONE';
}

export default async function TasksPage() {
  const session = await requireSession();
  const householdId = session.householdId;

  const tasks = await apiFetch<TaskRowData[]>(
    `/households/${householdId}/tasks`,
  );

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Tasks</h1>

      <Card>
        <CardHeader>
          <CardTitle>Household task board</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <TaskForm householdId={householdId} />
          {tasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">No tasks yet.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {tasks.map((task) => (
                <TaskRow
                  key={task.id}
                  householdId={householdId}
                  taskId={task.id}
                  description={task.description}
                  status={task.status}
                />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
