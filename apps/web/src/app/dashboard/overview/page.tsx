import Link from 'next/link';
import type { ReactNode } from 'react';
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
  AlertTriangle,
  ArrowUpRight,
  Bell,
  CheckCircle2,
  CheckSquare,
  Circle,
  Clock,
  FileText,
  Inbox,
  Mail,
  MessageSquare,
  Receipt,
  ShieldQuestion,
  Sliders,
  Sparkles,
} from 'lucide-react';

import { apiFetch } from '../../../lib/api-client';
import { requireSession } from '../../../lib/session';
import { RunNowButton } from './run-now-button';

interface EventRow {
  id: string;
  type: string;
  source: string;
  payload: Record<string, unknown>;
  occurredAt: string;
  processedAt: string | null;
  needsReview: boolean;
}

interface NotificationRow {
  id: string;
  channel: string;
  status: 'PENDING' | 'SENT' | 'FAILED';
  payload: { to?: string; subject?: string };
  failReason: string | null;
  createdAt: string;
}

interface TaskRow {
  id: string;
  description: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'DONE';
  dueOn: string | null;
}

interface DocumentRow {
  id: string;
  type: string;
  label: string;
  expiresOn: string;
}

interface RuleRow {
  id: string;
  isActive: boolean;
}

interface ConnectorRow {
  key: string;
  connected: boolean;
}

interface MeResponse {
  name: string | null;
  phone: string | null;
}

interface ConfigResponse {
  currencySymbol: string;
  timezone: string;
  digestChannel: string;
}

interface AttentionItem {
  key: string;
  tone: 'critical' | 'warning' | 'info';
  icon: ReactNode;
  title: string;
  detail: string;
  href?: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export default async function OverviewPage() {
  const session = await requireSession();
  const householdId = session.householdId;

  const [
    events,
    notifications,
    tasks,
    documents,
    rules,
    me,
    config,
    review,
    connectors,
    household,
  ] = await Promise.all([
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
    apiFetch<ConfigResponse>(`/households/${householdId}/config`).catch(
      () => null,
    ),
    apiFetch<unknown[]>(`/households/${householdId}/events/review`).catch(
      () => [],
    ),
    apiFetch<ConnectorRow[]>(`/households/${householdId}/connectors`).catch(
      () => [],
    ),
    apiFetch<{ name: string }>(`/households/${householdId}`).catch(() => null),
  ]);

  const now = new Date();
  const symbol = config?.currencySymbol ?? '₹';
  const timeZone = config?.timezone ?? 'UTC';
  const formatWhen = (iso: string) =>
    new Date(iso).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZone,
    });
  const formatDay = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      timeZone,
    });

  const firstName = me?.name?.trim().split(/\s+/)[0] ?? null;
  const hour = Number(
    new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      hour12: false,
      timeZone,
    }).format(now),
  );
  const greeting =
    hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  // ── Derived facts ─────────────────────────────────────────────────────────
  const docsWithDays = documents
    .map((doc) => ({
      ...doc,
      days: Math.ceil(
        (new Date(doc.expiresOn).getTime() - now.getTime()) / DAY_MS,
      ),
    }))
    .sort((a, b) => a.days - b.days);
  const expiredDocs = docsWithDays.filter((d) => d.days < 0);
  const expiringDocs = docsWithDays.filter((d) => d.days >= 0 && d.days <= 30);

  const openTasks = tasks.filter((t) => t.status !== 'DONE');
  const overdueTasks = openTasks.filter(
    (t) => t.dueOn && new Date(t.dueOn).getTime() < now.getTime(),
  );

  // Bills only reach the dashboard as detected events (there's no bills page yet), so collapse
  // the reminder/overdue duplicates the scanner emits for one bill down to a single row.
  const billsByKey = new Map<
    string,
    { vendor: string; amount: number | null; dueDate: string; days: number }
  >();
  for (const event of events) {
    if (event.type !== 'BILL_DETECTED' || event.needsReview) continue;
    const { vendor, amount, dueDate, billId } = event.payload;
    if (typeof vendor !== 'string' || typeof dueDate !== 'string') continue;
    const key =
      typeof billId === 'string' ? billId : `${vendor}|${dueDate.slice(0, 10)}`;
    billsByKey.set(key, {
      vendor,
      amount: typeof amount === 'number' ? amount : null,
      dueDate,
      days: Math.ceil((new Date(dueDate).getTime() - now.getTime()) / DAY_MS),
    });
  }
  const bills = [...billsByKey.values()]
    .filter((b) => b.days <= 14 && b.days >= -30)
    .sort((a, b) => a.days - b.days);

  const failedAlerts = notifications.filter((n) => n.status === 'FAILED');
  const activeRules = rules.filter((r) => r.isActive).length;
  const reviewCount = review.length;

  // ── Needs attention ──────────────────────────────────────────────────────
  const attention: AttentionItem[] = [];
  if (failedAlerts.length > 0) {
    attention.push({
      key: 'failed',
      tone: 'critical',
      icon: <AlertTriangle className="h-4 w-4" />,
      title: `${failedAlerts.length} alert${failedAlerts.length === 1 ? '' : 's'} failed to send`,
      detail:
        failedAlerts[0]?.failReason ?? 'Check your email or WhatsApp setup.',
      href: '/dashboard/settings/household',
    });
  }
  if (reviewCount > 0) {
    attention.push({
      key: 'review',
      tone: 'warning',
      icon: <ShieldQuestion className="h-4 w-4" />,
      title: `${reviewCount} detected item${reviewCount === 1 ? '' : 's'} need your OK`,
      detail:
        'Cairn wasn’t sure about these. Approve to alert your household, or dismiss.',
      href: '/dashboard/review',
    });
  }
  for (const doc of [...expiredDocs, ...expiringDocs].slice(0, 4)) {
    attention.push({
      key: `doc-${doc.id}`,
      tone: doc.days < 0 || doc.days <= 7 ? 'critical' : 'warning',
      icon: <FileText className="h-4 w-4" />,
      title: doc.label,
      detail:
        doc.days < 0
          ? `Expired ${Math.abs(doc.days)} day${Math.abs(doc.days) === 1 ? '' : 's'} ago`
          : `Expires in ${doc.days} day${doc.days === 1 ? '' : 's'} (${formatDay(doc.expiresOn)})`,
      href: '/dashboard/documents',
    });
  }
  for (const bill of bills.filter((b) => b.days <= 7).slice(0, 3)) {
    attention.push({
      key: `bill-${bill.vendor}-${bill.dueDate}`,
      tone: bill.days < 0 || bill.days <= 3 ? 'critical' : 'warning',
      icon: <Receipt className="h-4 w-4" />,
      title: `${bill.vendor}${bill.amount !== null ? ` · ${symbol}${bill.amount.toLocaleString('en-IN')}` : ''}`,
      detail:
        bill.days < 0
          ? `Was due ${formatDay(bill.dueDate)} (${Math.abs(bill.days)} days ago)`
          : `Due ${formatDay(bill.dueDate)} (in ${bill.days} day${bill.days === 1 ? '' : 's'})`,
    });
  }
  for (const task of overdueTasks.slice(0, 3)) {
    attention.push({
      key: `task-${task.id}`,
      tone: 'warning',
      icon: <CheckSquare className="h-4 w-4" />,
      title: task.description,
      detail: `Overdue since ${formatDay(task.dueOn as string)}`,
      href: '/dashboard/tasks',
    });
  }

  // ── Setup checklist ───────────────────────────────────────────────────────
  const setup = [
    {
      label: 'Add a document to track',
      done: documents.length > 0,
      href: '/dashboard/documents',
    },
    {
      label: 'Add a household task',
      done: tasks.length > 0,
      href: '/dashboard/tasks',
    },
    {
      label: 'Connect Gmail or Calendar so Cairn can find bills',
      done: connectors.some(
        (c) => (c.key === 'GMAIL' || c.key === 'CALENDAR') && c.connected,
      ),
      href: '/dashboard/settings/integrations',
    },
    {
      label: 'Link your WhatsApp number',
      done: Boolean(me?.phone),
      href: '/dashboard/settings/household',
    },
    {
      label: 'Add an early-warning rule',
      done: rules.length > 0,
      href: '/dashboard/rules',
    },
  ];
  const setupDone = setup.filter((s) => s.done).length;

  // ── Health / schedule ─────────────────────────────────────────────────────
  const lastProcessed = events
    .map((e) => e.processedAt)
    .filter((v): v is string => Boolean(v))
    .sort()
    .pop();
  const channelLabel =
    config?.digestChannel === 'WHATSAPP'
      ? 'WhatsApp'
      : config?.digestChannel === 'BOTH'
        ? 'email and WhatsApp'
        : 'email';

  const recentAlerts = notifications.slice(0, 6);
  const recentFinds = events.filter((e) => !e.needsReview).slice(0, 5);

  return (
    <div className="flex flex-col gap-8 pb-10">
      {/* 1. Greeting + status */}
      <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-col gap-2 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              {failedAlerts.length > 0 ? (
                <Badge variant="warning" className="gap-1.5 text-[11px]">
                  <span className="h-2 w-2 rounded-full bg-amber-500" />
                  {failedAlerts.length} alert
                  {failedAlerts.length === 1 ? '' : 's'} failed to send
                </Badge>
              ) : notifications.length > 0 ? (
                <Badge variant="secondary" className="gap-1.5 text-[11px]">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  Alerts are being delivered
                </Badge>
              ) : (
                <Badge variant="secondary" className="gap-1.5 text-[11px]">
                  <span className="h-2 w-2 rounded-full bg-muted-foreground/50" />
                  No alerts sent yet
                </Badge>
              )}
              {household?.name && (
                <span className="text-xs text-muted-foreground">
                  {household.name}
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              {greeting}
              {firstName ? `, ${firstName}` : ''}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl">
              Cairn watches your documents, bills and calendar, and alerts your
              household by {channelLabel} before anything lapses. Once a day
              (03:00 UTC) it checks everything
              {lastProcessed
                ? `; the last check finished ${formatWhen(lastProcessed)}`
                : ''}
              .
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <RunNowButton householdId={householdId} />
            <Link href="/dashboard/documents">
              <Button size="sm" className="gap-1.5 text-xs font-semibold">
                <FileText className="h-3.5 w-3.5" />
                Add document
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* 2. At-a-glance tiles (each links to where you act on it) */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Tile
          href="/dashboard/documents"
          icon={<FileText className="h-3.5 w-3.5" />}
          label="Documents"
          value={documents.length}
          note={
            expiredDocs.length + expiringDocs.length > 0
              ? `${expiredDocs.length + expiringDocs.length} expired or expiring within 30 days`
              : 'Nothing expiring within 30 days'
          }
          warn={expiredDocs.length + expiringDocs.length > 0}
        />
        <Tile
          href="/dashboard/tasks"
          icon={<CheckSquare className="h-3.5 w-3.5" />}
          label="Open tasks"
          value={openTasks.length}
          note={
            overdueTasks.length > 0
              ? `${overdueTasks.length} overdue`
              : 'None overdue'
          }
          warn={overdueTasks.length > 0}
        />
        <Tile
          href="/dashboard/review"
          icon={<ShieldQuestion className="h-3.5 w-3.5" />}
          label="Needs your OK"
          value={reviewCount}
          note={
            reviewCount > 0
              ? 'Detected items waiting on you'
              : 'Nothing waiting'
          }
          warn={reviewCount > 0}
        />
        <Tile
          href="/dashboard/rules"
          icon={<Sliders className="h-3.5 w-3.5" />}
          label="Early-warning rules"
          value={activeRules}
          note={
            activeRules > 0
              ? 'Active on top of Preferences'
              : 'Using default reminder days'
          }
        />
      </div>

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-12">
        <div className="flex flex-col gap-6 xl:col-span-7 2xl:col-span-8">
          {/* 3. Needs attention */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">
                Needs your attention
              </CardTitle>
              <CardDescription className="text-xs">
                The things most likely to bite if left alone.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {attention.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <CheckCircle2 className="h-8 w-8 text-emerald-500 mb-2" />
                  <p className="text-sm font-medium text-foreground">
                    You’re all caught up
                  </p>
                  <p className="text-xs text-muted-foreground max-w-sm mt-1">
                    No expired documents, due bills, overdue tasks or items
                    waiting on you.
                  </p>
                </div>
              ) : (
                <ul className="flex flex-col gap-2.5">
                  {attention.map((item) => (
                    <AttentionRow key={item.key} item={item} />
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* 4. Upcoming bills (only when there are any) */}
          {bills.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">
                  Bills coming up
                </CardTitle>
                <CardDescription className="text-xs">
                  Bills Cairn found in your email or that you entered, due
                  within two weeks.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="flex flex-col divide-y divide-border">
                  {bills.map((bill) => (
                    <li
                      key={`${bill.vendor}-${bill.dueDate}`}
                      className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Receipt className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="text-sm font-medium truncate">
                          {bill.vendor}
                        </span>
                        {bill.amount !== null && (
                          <span className="text-xs text-muted-foreground">
                            {symbol}
                            {bill.amount.toLocaleString('en-IN')}
                          </span>
                        )}
                      </div>
                      <Badge
                        variant={
                          bill.days < 0
                            ? 'destructive'
                            : bill.days <= 3
                              ? 'warning'
                              : 'secondary'
                        }
                        className="text-[10px] shrink-0"
                      >
                        {bill.days < 0
                          ? `${Math.abs(bill.days)}d past due`
                          : bill.days === 0
                            ? 'Due today'
                            : `Due in ${bill.days}d`}
                      </Badge>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="flex flex-col gap-6 xl:col-span-5 2xl:col-span-4">
          {/* 5. Setup checklist for new households */}
          {setupDone < setup.length && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Get set up
                  </CardTitle>
                  <span className="text-xs text-muted-foreground">
                    {setupDone} of {setup.length}
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-secondary/80 overflow-hidden mt-2">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${(setupDone / setup.length) * 100}%` }}
                  />
                </div>
              </CardHeader>
              <CardContent>
                <ul className="flex flex-col gap-1.5">
                  {setup.map((step) => (
                    <li key={step.label}>
                      <Link
                        href={step.href}
                        className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-xs hover:bg-muted"
                      >
                        {step.done ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                        ) : (
                          <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
                        )}
                        <span
                          className={
                            step.done
                              ? 'text-muted-foreground line-through'
                              : 'text-foreground'
                          }
                        >
                          {step.label}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* 6. What Cairn did */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Bell className="h-4 w-4 text-primary" />
                Alerts Cairn sent
              </CardTitle>
              <CardDescription className="text-xs">
                Who was told what, most recent first.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recentAlerts.length === 0 ? (
                <EmptyLine
                  icon={<Mail className="h-4 w-4 opacity-60" />}
                  text="No alerts yet. They start once something enters a warning window."
                />
              ) : (
                <ul className="flex flex-col gap-2.5">
                  {recentAlerts.map((n) => (
                    <li
                      key={n.id}
                      className="flex items-start justify-between gap-3 rounded-lg border border-border bg-background p-2.5"
                    >
                      <div className="flex items-start gap-2.5 min-w-0">
                        <div className="mt-0.5 text-muted-foreground shrink-0">
                          {n.channel === 'WHATSAPP' ? (
                            <MessageSquare className="h-3.5 w-3.5 text-emerald-500" />
                          ) : (
                            <Mail className="h-3.5 w-3.5" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-foreground truncate">
                            {n.payload.subject ?? 'Alert'}
                          </p>
                          <p className="text-[11px] text-muted-foreground truncate">
                            {n.channel === 'WHATSAPP'
                              ? 'Messaged'
                              : n.channel === 'EMAIL'
                                ? 'Emailed'
                                : 'Posted for'}{' '}
                            {n.payload.to ?? 'household'} ·{' '}
                            {formatWhen(n.createdAt)}
                          </p>
                          {n.status === 'FAILED' && n.failReason && (
                            <p className="text-[11px] text-destructive truncate">
                              {n.failReason}
                            </p>
                          )}
                        </div>
                      </div>
                      <Badge
                        variant={
                          n.status === 'SENT'
                            ? 'success'
                            : n.status === 'FAILED'
                              ? 'destructive'
                              : 'warning'
                        }
                        className="text-[10px] py-0 px-1.5 shrink-0"
                      >
                        {n.status === 'SENT'
                          ? 'Sent'
                          : n.status === 'FAILED'
                            ? 'Failed'
                            : 'Queued'}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* 7. What Cairn found */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                Recently found
              </CardTitle>
              <CardDescription className="text-xs">
                Bills, deadlines and tasks Cairn picked up.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recentFinds.length === 0 ? (
                <EmptyLine
                  icon={<Inbox className="h-4 w-4 opacity-60" />}
                  text="Nothing found yet. Connect Gmail or Calendar, or add items by hand."
                />
              ) : (
                <ul className="flex flex-col gap-2.5">
                  {recentFinds.map((e) => (
                    <li
                      key={e.id}
                      className="rounded-lg border border-border bg-background p-2.5"
                    >
                      <p className="text-xs font-medium text-foreground">
                        {describeEvent(e, symbol, formatDay)}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {sourceLabel(e)} · {formatWhen(e.occurredAt)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Tile({
  href,
  icon,
  label,
  value,
  note,
  warn = false,
}: {
  href: string;
  icon: ReactNode;
  label: string;
  value: number;
  note: string;
  warn?: boolean;
}) {
  return (
    <Link href={href} className="group">
      <Card variant="interactive" className="h-full">
        <CardHeader className="pb-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">{label}</span>
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-secondary">
              {icon}
            </div>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">
            {value}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 pb-4">
          <p
            className={`text-[11px] ${warn ? 'text-amber-600 dark:text-amber-400 font-medium' : 'text-muted-foreground'}`}
          >
            {note}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}

function AttentionRow({ item }: { item: AttentionItem }) {
  const tone =
    item.tone === 'critical'
      ? 'border-destructive/40 bg-destructive/5 text-destructive'
      : item.tone === 'warning'
        ? 'border-warning/40 bg-warning/5 text-amber-600 dark:text-amber-400'
        : 'border-border bg-background text-muted-foreground';
  const body = (
    <div
      className={`flex items-center gap-3 rounded-lg border p-3 ${tone.split(' ').slice(0, 2).join(' ')}`}
    >
      <div className={`shrink-0 ${tone.split(' ').slice(2).join(' ')}`}>
        {item.icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground truncate">
          {item.title}
        </p>
        <p className="text-xs text-muted-foreground">{item.detail}</p>
      </div>
      {item.href && (
        <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      )}
    </div>
  );
  return <li>{item.href ? <Link href={item.href}>{body}</Link> : body}</li>;
}

function EmptyLine({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-2.5 text-xs text-muted-foreground py-2">
      {icon}
      <span>{text}</span>
    </div>
  );
}

function describeEvent(
  event: EventRow,
  symbol: string,
  formatDay: (iso: string) => string,
): string {
  const p = event.payload;
  const str = (v: unknown) => (typeof v === 'string' ? v : null);
  switch (event.type) {
    case 'BILL_DETECTED': {
      const amount =
        typeof p.amount === 'number'
          ? ` ${symbol}${p.amount.toLocaleString('en-IN')}`
          : '';
      const due = str(p.dueDate);
      return `${str(p.vendor) ?? 'Bill'}${amount}${due ? ` due ${formatDay(due)}` : ''}`;
    }
    case 'DOCUMENT_EXPIRING': {
      const exp = str(p.expiresOn);
      return `${str(p.documentLabel) ?? str(p.documentType) ?? 'Document'}${exp ? ` expires ${formatDay(exp)}` : ''}`;
    }
    case 'MAINTENANCE_DUE': {
      const due = str(p.dueOn);
      return `${str(p.asset) ?? 'Maintenance'}: ${str(p.task) ?? 'due'}${due ? ` (${formatDay(due)})` : ''}`;
    }
    case 'TASK_EXTRACTED':
      return str(p.description) ?? 'Task found';
    default:
      return event.type.replace(/_/g, ' ').toLowerCase();
  }
}

function sourceLabel(event: EventRow): string {
  const p = event.payload;
  if (
    p.reminderThreshold !== undefined ||
    p.isReminder ||
    p.isOverdue ||
    p.isExpired
  ) {
    return 'Automatic reminder';
  }
  const labels: Record<string, string> = {
    GMAIL: 'Found in Gmail',
    CALENDAR: 'From Google Calendar',
    OCR: 'From a receipt scan',
    WHATSAPP: 'Sent via WhatsApp',
    MANUAL: 'Added by hand',
  };
  return labels[event.source] ?? event.source.toLowerCase();
}
