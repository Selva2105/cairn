import Link from 'next/link';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@cairn/ui';
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Bell,
  Bot,
  CheckSquare,
  Clock,
  FileText,
  Inbox,
  Mail,
  MessageSquare,
  Plus,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  TrendingUp,
} from 'lucide-react';

import { apiFetch } from '../../../lib/api-client';
import { requireSession } from '../../../lib/session';

interface EventRow {
  id: string;
  type: string;
  source: string;
  payload: Record<string, unknown>;
  occurredAt: string;
  processedAt: string | null;
}

interface NotificationRow {
  id: string;
  channel: string;
  status: 'PENDING' | 'SENT' | 'FAILED';
  createdAt: string;
}

interface TaskRow {
  id: string;
  description: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'DONE';
}

interface DocumentRow {
  id: string;
  type: string;
  label: string;
  expiresOn: string;
  notes: string | null;
}

interface RuleRow {
  id: string;
  name: string;
  isActive: boolean;
}

interface MeResponse {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  emailVerifiedAt: string | null;
  whatsappConfigured: boolean;
}

export default async function OverviewPage() {
  const session = await requireSession();
  const householdId = session.householdId;

  // Concurrently fetch all household intelligence
  const [events, notifications, tasks, documents, rules, me] =
    await Promise.all([
      apiFetch<EventRow[]>(`/households/${householdId}/events`).catch(() => []),
      apiFetch<NotificationRow[]>(
        `/households/${householdId}/notifications`,
      ).catch(() => []),
      apiFetch<TaskRow[]>(`/households/${householdId}/tasks`).catch(() => []),
      apiFetch<DocumentRow[]>(`/households/${householdId}/documents`).catch(
        () => [],
      ),
      apiFetch<RuleRow[]>(`/households/${householdId}/rules`).catch(() => []),
      apiFetch<MeResponse>('/users/me').catch(() => null),
    ]);

  // Derived metrics
  const now = new Date();

  const openTasks = tasks.filter((t) => t.status !== 'DONE').length;
  const doneTasks = tasks.filter((t) => t.status === 'DONE').length;
  const taskCompletionRate = tasks.length
    ? Math.round((doneTasks / tasks.length) * 100)
    : 0;

  const docsWithDays = documents
    .map((doc) => {
      const expiry = new Date(doc.expiresOn);
      const diffDays = Math.ceil(
        (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );
      return { ...doc, diffDays };
    })
    .sort((a, b) => a.diffDays - b.diffDays);

  const expiringSoon = docsWithDays.filter(
    (d) => d.diffDays <= 30 && d.diffDays >= 0,
  );
  const activeRulesCount = rules.filter((r) => r.isActive).length;

  const isPhoneLinked = Boolean(me?.phone);
  const isWhatsAppConfigured = Boolean(me?.whatsappConfigured);
  const isWhatsAppConnected = isPhoneLinked && isWhatsAppConfigured;

  // Time of day greeting
  const hour = now.getHours();
  const timeGreeting =
    hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  const formattedDate = now.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="flex flex-col gap-8 pb-10">
      {/* 1. Hero Greeting & Quick Action Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-6 sm:p-8">
        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <Badge
                variant="secondary"
                className="text-[11px] font-medium gap-1.5 px-2.5 py-0.5"
              >
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span>System Operational</span>
              </Badge>
              <span className="text-xs text-muted-foreground">
                • {formattedDate}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              {timeGreeting}, Household! 👋
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-xl">
              Here is what Cairn has coordinated across your documents, shared
              duties, and automated alert pipelines.
            </p>
          </div>

          {/* Quick Action CTAs */}
          <div className="flex flex-wrap items-center gap-2.5">
            <Link href="/dashboard/tasks">
              <Button size="sm" variant="outline" className="gap-1.5 text-xs">
                <CheckSquare className="h-3.5 w-3.5" />
                <span>View Tasks</span>
              </Button>
            </Link>
            <Link href="/dashboard/documents">
              <Button size="sm" className="gap-1.5 text-xs font-semibold">
                <Plus className="h-3.5 w-3.5" />
                <span>Add Record</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* 2. Executive KPI Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Active Tasks */}
        <Card variant="interactive" className="flex flex-col justify-between">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                Open Duties
              </span>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <CheckSquare className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <CardTitle className="text-2xl font-bold tracking-tight">
                {openTasks}
              </CardTitle>
              <span className="text-xs text-muted-foreground">pending</span>
            </div>
          </CardHeader>
          <CardContent className="pt-0 pb-4">
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span>Completion rate</span>
                <span className="font-semibold text-foreground">
                  {taskCompletionRate}%
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-secondary/80 overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500"
                  style={{ width: `${taskCompletionRate}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Tracked Documents */}
        <Card variant="interactive" className="flex flex-col justify-between">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                Vital Records
              </span>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                <FileText className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <CardTitle className="text-2xl font-bold tracking-tight">
                {documents.length}
              </CardTitle>
              <span className="text-xs text-muted-foreground">in vault</span>
            </div>
          </CardHeader>
          <CardContent className="pt-0 pb-4">
            <div className="flex items-center justify-between text-[11px]">
              {expiringSoon.length > 0 ? (
                <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-medium">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  <span>{expiringSoon.length} expiring soon</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>All dates safe (&gt;30d)</span>
                </div>
              )}
              <Link
                href="/dashboard/documents"
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-0.5"
              >
                Vault <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Automation Rules */}
        <Card variant="interactive" className="flex flex-col justify-between">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                Active Rules
              </span>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Sliders className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <CardTitle className="text-2xl font-bold tracking-tight">
                {activeRulesCount}
              </CardTitle>
              <span className="text-xs text-muted-foreground">automations</span>
            </div>
          </CardHeader>
          <CardContent className="pt-0 pb-4">
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span>Threshold coverage</span>
              <span className="font-semibold text-foreground">
                {rules.length > 0 ? 'Customized' : 'Standard 30d'}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Card 4: System Events */}
        <Card variant="interactive" className="flex flex-col justify-between">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                Observed Events
              </span>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                <TrendingUp className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <CardTitle className="text-2xl font-bold tracking-tight">
                {events.length}
              </CardTitle>
              <span className="text-xs text-muted-foreground">logged</span>
            </div>
          </CardHeader>
          <CardContent className="pt-0 pb-4">
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span>Dispatches sent</span>
              <span className="font-semibold text-foreground">
                {notifications.length}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3. Core Operational Layout (Asymmetric 12-column grid on xl screens) */}
      <div className="grid grid-cols-1 gap-8 xl:grid-cols-12">
        {/* Left Column: Primary Focus (Urgent Expirations + Household Duties) */}
        <div className="flex flex-col gap-6 xl:col-span-7 2xl:col-span-8">
          {/* Expiration Radar */}
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-400">
                  <ShieldAlert className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-foreground">
                    Expiration Radar
                  </h2>
                  <p className="text-[11px] text-muted-foreground">
                    Upcoming renewal thresholds requiring household attention.
                  </p>
                </div>
              </div>
              <Link
                href="/dashboard/documents"
                className="text-xs font-medium text-primary hover:underline flex items-center gap-1"
              >
                Manage all ({documents.length})
                <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>

            <div className="pt-4">
              {docsWithDays.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted mb-3">
                    <FileText className="h-5 w-5 opacity-60" />
                  </div>
                  <p className="text-sm font-medium text-foreground">
                    Vault is currently empty
                  </p>
                  <p className="text-xs max-w-sm mt-1 mb-4">
                    Upload warranties, passports, insurance policies, and
                    subscriptions to track critical deadlines.
                  </p>
                  <Link href="/dashboard/documents">
                    <Button size="sm" variant="outline" className="text-xs">
                      Deposit First Document
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {docsWithDays.slice(0, 4).map((doc) => {
                    const isUrgent = doc.diffDays <= 30 && doc.diffDays >= 0;
                    const isOverdue = doc.diffDays < 0;

                    return (
                      <div
                        key={doc.id}
                        className={`flex flex-col justify-between rounded-lg p-3.5 border transition-colors ${
                          isOverdue
                            ? 'border-destructive/40 bg-destructive/5'
                            : isUrgent
                              ? 'border-warning/40 bg-warning/5'
                              : 'border-border bg-background'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex flex-col gap-0.5 min-w-0">
                            <span className="text-xs font-semibold text-foreground truncate">
                              {doc.label}
                            </span>
                            <span className="text-[11px] text-muted-foreground uppercase font-mono">
                              {doc.type}
                            </span>
                          </div>
                          <Badge
                            variant={
                              isOverdue
                                ? 'destructive'
                                : isUrgent
                                  ? 'warning'
                                  : 'secondary'
                            }
                            className="text-[10px] px-2 py-0.5 shrink-0"
                          >
                            {isOverdue
                              ? `${Math.abs(doc.diffDays)}d expired`
                              : `${doc.diffDays}d remaining`}
                          </Badge>
                        </div>

                        <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground pt-2 border-t border-border/50">
                          <span>Expires {doc.expiresOn.split('T')[0]}</span>
                          <Link
                            href="/dashboard/documents"
                            className="text-primary font-medium hover:underline flex items-center gap-0.5"
                          >
                            <span>Inspect</span>
                            <ArrowUpRight className="h-3 w-3" />
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Household Action Items (High-Priority Duties) */}
          <div className="rounded-xl border border-border bg-card p-5 sm:p-6">
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <div className="flex items-center gap-2">
                <CheckSquare className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-semibold tracking-tight text-foreground">
                  Household Action Items
                </h2>
              </div>
              <Link
                href="/dashboard/tasks"
                className="text-xs font-medium text-primary hover:underline flex items-center gap-1"
              >
                <span>View all tasks ({tasks.length})</span>
                <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>

            <div className="pt-4">
              {tasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                  <p className="text-xs">
                    No active chores or scheduled responsibilities.
                  </p>
                  <Link
                    href="/dashboard/tasks"
                    className="mt-2 text-xs font-medium text-primary hover:underline"
                  >
                    + Add a household task
                  </Link>
                </div>
              ) : (
                <div className="flex flex-col divide-y divide-border">
                  {tasks.slice(0, 5).map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11px] ${
                            task.status === 'DONE'
                              ? 'border-success bg-success/15 text-success'
                              : 'border-border bg-muted text-muted-foreground'
                          }`}
                        >
                          {task.status === 'DONE' ? '✓' : '•'}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span
                            className={`text-xs font-medium truncate ${
                              task.status === 'DONE'
                                ? 'text-muted-foreground line-through'
                                : 'text-foreground'
                            }`}
                          >
                            {task.description}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Badge
                          variant={
                            task.status === 'DONE' ? 'success' : 'secondary'
                          }
                          className="text-[10px] uppercase font-mono px-2 py-0"
                        >
                          {task.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Live Operational Rail (Gateway Status, Dispatches, Activity Stream) */}
        <div className="flex flex-col gap-6 xl:col-span-5 2xl:col-span-4">
          {/* Card 1: Intelligent Assistant & Gateway Health */}
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <div
                  className={`flex h-7 w-7 items-center justify-center rounded-lg ${
                    isWhatsAppConnected
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  <Bot className="h-4 w-4" />
                </div>
                <h3 className="text-sm font-semibold text-foreground">
                  Assistant Gateway
                </h3>
              </div>
              {isWhatsAppConnected ? (
                <Badge
                  variant="success"
                  className="text-[10px] py-0 px-2 gap-1.5"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Online</span>
                </Badge>
              ) : isWhatsAppConfigured ? (
                <Badge
                  variant="outline"
                  className="text-[10px] py-0 px-2 gap-1.5 border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                  <span>Action Required</span>
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="text-[10px] py-0 px-2 gap-1.5 border-border bg-muted/40 text-muted-foreground"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
                  <span>Not Connected</span>
                </Badge>
              )}
            </div>

            <div className="pt-3 flex flex-col gap-2.5 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-background border border-border">
                <div className="flex items-center gap-2">
                  <MessageSquare
                    className={`h-3.5 w-3.5 ${
                      isWhatsAppConnected
                        ? 'text-emerald-500'
                        : 'text-muted-foreground'
                    }`}
                  />
                  <span className="text-muted-foreground">WhatsApp Bot</span>
                </div>
                {isWhatsAppConnected ? (
                  <span className="font-mono font-medium text-emerald-600 dark:text-emerald-400">
                    Connected ({me?.phone})
                  </span>
                ) : isPhoneLinked ? (
                  <span className="font-mono font-medium text-muted-foreground">
                    Server Offline
                  </span>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-medium text-amber-600 dark:text-amber-400">
                      Not Linked
                    </span>
                    <Link
                      href="/dashboard/settings/household"
                      className="font-medium text-primary hover:underline ml-1"
                    >
                      Connect →
                    </Link>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-background border border-border">
                <div className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 text-primary" />
                  <span className="text-muted-foreground">Daily Digest</span>
                </div>
                <span className="font-mono font-medium text-foreground">
                  09:00 AM UTC
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-background border border-border">
                <div className="flex items-center gap-2">
                  <Sliders className="h-3.5 w-3.5 text-primary" />
                  <span className="text-muted-foreground">Trigger Rules</span>
                </div>
                <span className="font-mono font-medium text-foreground">
                  {activeRulesCount} Active
                </span>
              </div>

              <Link
                href="/dashboard/settings/household"
                className="mt-1 flex items-center justify-center gap-1.5 rounded-lg border border-border bg-background py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <span>Household & Bot Settings</span>
                <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
          </div>

          {/* Card 2: Dispatch History */}
          <Card className="flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Bell className="h-3.5 w-3.5" />
                  </div>
                  <CardTitle className="text-sm font-semibold">
                    Dispatch History
                  </CardTitle>
                </div>
                <Badge variant="secondary" className="font-mono text-[10px]">
                  {notifications.length}
                </Badge>
              </div>
              <CardDescription className="text-xs">
                Alerts dispatched to household members.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 pt-0">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-6 text-center">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted border border-border text-muted-foreground mb-2">
                    <Mail className="h-4 w-4 opacity-60" />
                  </div>
                  <p className="text-xs font-medium text-foreground">
                    No dispatches yet
                  </p>
                </div>
              ) : (
                <ul className="flex flex-col gap-2">
                  {notifications.slice(0, 4).map((notification) => (
                    <li
                      key={notification.id}
                      className="flex items-center justify-between rounded-lg border border-border bg-background p-2.5 transition-colors hover:border-foreground/30"
                    >
                      <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
                          {notification.channel
                            .toLowerCase()
                            .includes('whatsapp') ? (
                            <MessageSquare className="h-3 w-3 text-emerald-500" />
                          ) : (
                            <Mail className="h-3 w-3" />
                          )}
                        </div>
                        <div>
                          <p className="text-xs font-medium text-foreground capitalize">
                            {notification.channel} Alert
                          </p>
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(
                              notification.createdAt,
                            ).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      </div>
                      <Badge
                        variant={
                          notification.status === 'SENT'
                            ? 'success'
                            : notification.status === 'FAILED'
                              ? 'destructive'
                              : 'warning'
                        }
                        className="text-[10px] py-0 px-1.5"
                      >
                        {notification.status}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Card 3: Activity Timeline */}
          <Card className="flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Activity className="h-3.5 w-3.5" />
                  </div>
                  <CardTitle className="text-sm font-semibold">
                    Activity Timeline
                  </CardTitle>
                </div>
                <Badge variant="secondary" className="font-mono text-[10px]">
                  {events.length}
                </Badge>
              </div>
              <CardDescription className="text-xs">
                Real-time operational event stream.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 pt-0">
              {events.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-6 text-center">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted border border-border text-muted-foreground mb-2">
                    <Inbox className="h-4 w-4 opacity-60" />
                  </div>
                  <p className="text-xs font-medium text-foreground">
                    No events recorded
                  </p>
                </div>
              ) : (
                <div className="relative pl-5 border-l border-border ml-2 flex flex-col gap-2.5">
                  {events.slice(0, 5).map((event) => (
                    <div key={event.id} className="relative group">
                      <div className="absolute -left-[25px] top-2 h-2 w-2 rounded-full border border-background bg-primary" />
                      <div className="flex items-center justify-between rounded-lg border border-border bg-background p-2.5 transition-colors hover:border-foreground/30">
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="text-xs font-medium text-foreground">
                              {humanizeType(event.type)}
                            </p>
                            {typeof event.payload?.vendor === 'string' && (
                              <span className="text-[11px] font-semibold text-primary">
                                • {event.payload.vendor}
                                {typeof event.payload?.amount === 'number'
                                  ? ` (₹${event.payload.amount})`
                                  : ''}
                              </span>
                            )}
                            {typeof event.payload?.description === 'string' && (
                              <span className="text-[11px] font-medium text-muted-foreground">
                                • {event.payload.description}
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(event.occurredAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>

                        <Badge
                          variant={event.processedAt ? 'success' : 'warning'}
                          className="text-[9px] py-0 px-1"
                        >
                          {event.processedAt ? 'Processed' : 'Pending'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function humanizeType(type: string): string {
  return type
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/^\w/, (c) => c.toUpperCase());
}
