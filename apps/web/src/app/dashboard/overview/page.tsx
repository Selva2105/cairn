import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@cairn/ui';

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

export default async function OverviewPage() {
  const session = await requireSession();
  const householdId = session.householdId;

  const [events, notifications] = await Promise.all([
    apiFetch<EventRow[]>(`/households/${householdId}/events`),
    apiFetch<NotificationRow[]>(`/households/${householdId}/notifications`),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Overview</h1>

      <Card>
        <CardHeader>
          <CardTitle>Activity timeline</CardTitle>
          <CardDescription>
            Everything Cairn has noticed for your household.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {events.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nothing yet -- add a document or wait for the next digest.
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {events.map((event) => (
                <li
                  key={event.id}
                  className="flex items-center justify-between rounded-md border p-3"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {humanizeType(event.type)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(event.occurredAt).toLocaleString()}
                    </p>
                  </div>
                  <Badge variant={event.processedAt ? 'success' : 'warning'}>
                    {event.processedAt ? 'Processed' : 'Pending'}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Digest history</CardTitle>
          <CardDescription>
            Notifications sent to your household.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {notifications.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No notifications sent yet.
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {notifications.map((notification) => (
                <li
                  key={notification.id}
                  className="flex items-center justify-between rounded-md border p-3"
                >
                  <p className="text-sm">{notification.channel}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {new Date(notification.createdAt).toLocaleString()}
                    </span>
                    <Badge
                      variant={
                        notification.status === 'SENT'
                          ? 'success'
                          : notification.status === 'FAILED'
                            ? 'destructive'
                            : 'warning'
                      }
                    >
                      {notification.status}
                    </Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function humanizeType(type: string): string {
  return type
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/^\w/, (c) => c.toUpperCase());
}
