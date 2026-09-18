import { apiFetch } from '../../../../lib/api-client';
import { requireSession } from '../../../../lib/session';
import { SettingsTabs } from '../settings-tabs';
import { ConnectorStatusItem, IntegrationsClient } from './integrations-client';

interface HouseholdDetail {
  id: string;
  name: string;
}

export default async function IntegrationsPage() {
  const session = await requireSession();
  const householdId = session.householdId;

  const [household, connectors] = await Promise.all([
    apiFetch<HouseholdDetail>(`/households/${householdId}`),
    apiFetch<ConnectorStatusItem[]>(`/households/${householdId}/connectors`),
  ]);

  return (
    <div className="flex flex-col gap-6 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-1 pb-2">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          {household.name} — Integrations & Connectors
        </h1>
        <p className="text-xs text-muted-foreground">
          Connect external email, calendars, and messaging services to
          automatically ingest household bills, maintenance signals, and
          reminders.
        </p>
      </div>

      <SettingsTabs />

      <IntegrationsClient
        householdId={householdId}
        initialConnectors={connectors}
      />
    </div>
  );
}
