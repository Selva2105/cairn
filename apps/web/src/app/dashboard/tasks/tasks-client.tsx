'use client';

import { useState, useMemo } from 'react';
import { Badge, Card, CardContent, CardHeader, CardTitle } from '@cairn/ui';
import { CheckCircle2, Clock, ListChecks, Search, X } from 'lucide-react';

import { TaskForm } from './task-form';
import { TaskRow } from './task-row';

export interface TaskRowData {
  id: string;
  description: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'DONE';
}

export function TasksClient({
  tasks,
  householdId,
}: {
  tasks: TaskRowData[];
  householdId: string;
}) {
  const [selectedFilter, setSelectedFilter] = useState<
    'ALL' | 'OPEN' | 'IN_PROGRESS' | 'DONE'
  >('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Counts
  const totalCount = tasks.length;
  const openCount = tasks.filter((t) => t.status === 'OPEN').length;
  const inProgressCount = tasks.filter(
    (t) => t.status === 'IN_PROGRESS',
  ).length;
  const doneCount = tasks.filter((t) => t.status === 'DONE').length;

  const completionRate =
    totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  // Filtered tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      // Status filter
      if (selectedFilter !== 'ALL' && t.status !== selectedFilter) {
        return false;
      }
      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return t.description.toLowerCase().includes(q);
      }
      return true;
    });
  }, [tasks, selectedFilter, searchQuery]);

  return (
    <div className="flex flex-col gap-6">
      {/* 1. Productivity Summary & Quick Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Clock className="h-4 w-4" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground">
                Pending Action
              </span>
              <span className="text-lg font-bold text-foreground">
                {openCount + inProgressCount}
              </span>
            </div>
          </div>
          <Badge variant="warning" className="text-[10px]">
            Active
          </Badge>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground">Completed</span>
              <span className="text-lg font-bold text-foreground">
                {doneCount}
              </span>
            </div>
          </div>
          <Badge variant="success" className="text-[10px]">
            Resolved
          </Badge>
        </div>

        <div className="flex flex-col justify-between rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              Completion Velocity
            </span>
            <span className="text-xs font-bold text-foreground">
              {completionRate}%
            </span>
          </div>
          <div className="mt-2 h-2 w-full rounded-full bg-secondary/80 overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${completionRate}%` }}
            />
          </div>
        </div>
      </div>

      {/* 2. Main Board Card */}
      <Card className="flex flex-col">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <ListChecks className="h-4 w-4" />
              </div>
              <CardTitle className="text-base font-semibold">
                Household Board
              </CardTitle>
            </div>
            <span className="text-xs text-muted-foreground">
              Click status pill to cycle • Real-time synchronization
            </span>
          </div>
        </CardHeader>

        <CardContent className="flex flex-col gap-6">
          {/* Quick Add Bar */}
          <div className="p-4 rounded-xl border border-border bg-muted/20">
            <TaskForm householdId={householdId} />
          </div>

          {/* Filter Bar & Search */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              <button
                type="button"
                onClick={() => setSelectedFilter('ALL')}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  selectedFilter === 'ALL'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary/40 text-muted-foreground hover:bg-secondary hover:text-foreground'
                }`}
              >
                <span>All</span>
                <span className="opacity-80">({totalCount})</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedFilter('OPEN')}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  selectedFilter === 'OPEN'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary/40 text-muted-foreground hover:bg-secondary hover:text-foreground'
                }`}
              >
                <span>To Do</span>
                <span className="opacity-80">({openCount})</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedFilter('IN_PROGRESS')}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  selectedFilter === 'IN_PROGRESS'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary/40 text-muted-foreground hover:bg-secondary hover:text-foreground'
                }`}
              >
                <span>In Progress</span>
                <span className="opacity-80">({inProgressCount})</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedFilter('DONE')}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  selectedFilter === 'DONE'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary/40 text-muted-foreground hover:bg-secondary hover:text-foreground'
                }`}
              >
                <span>Done</span>
                <span className="opacity-80">({doneCount})</span>
              </button>
            </div>

            {/* Search Input */}
            <div className="relative sm:w-56">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search duties..."
                className="w-full rounded-lg border border-border bg-background pl-8 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground/40 focus:ring-1 focus:ring-foreground/20"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Task List */}
          {filteredTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-muted border border-border text-muted-foreground mb-3">
                <ListChecks className="h-5 w-5 opacity-60" />
              </div>
              <p className="text-sm font-semibold text-foreground">
                {searchQuery || selectedFilter !== 'ALL'
                  ? 'No matching tasks'
                  : 'All caught up!'}
              </p>
              <p className="text-xs text-muted-foreground max-w-sm mt-1">
                {searchQuery || selectedFilter !== 'ALL'
                  ? 'Try clearing the search query or selecting another filter tab.'
                  : 'There are no open chores right now. Add one above to keep household duties shared.'}
              </p>
            </div>
          ) : (
            <ul className="flex flex-col gap-2.5">
              {filteredTasks.map((task) => (
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
