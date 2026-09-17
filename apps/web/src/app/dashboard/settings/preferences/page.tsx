import { apiFetch } from '../../../../lib/api-client';
import { requireSession } from '../../../../lib/session';
import { SettingsTabs } from '../settings-tabs';
import { HouseholdConfigData, PreferencesClient } from './preferences-client';

interface HouseholdDetail {
  id: string;
  name: string;
}

export default async function PreferencesPage() {
  const session = await requireSession();
  const householdId = session.householdId;

  const [household, config] = await Promise.all([
    apiFetch<HouseholdDetail>(`/households/${householdId}`),
    apiFetch<HouseholdConfigData>(`/households/${householdId}/config`),
  ]);

  return (
    <div className="flex flex-col gap-6 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-1 pb-2">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          {household.name} — Preferences & Configuration
        </h1>
        <p className="text-xs text-muted-foreground">
          Customize document types, regional currency, reminder schedules, and
          automated digest settings.
        </p>
      </div>

      <SettingsTabs />

      <PreferencesClient householdId={householdId} initialConfig={config} />
    </div>
  );
}
