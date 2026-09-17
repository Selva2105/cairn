import { apiFetch } from '../../../../lib/api-client';
import { requireSession } from '../../../../lib/session';
import { SettingsTabs } from '../settings-tabs';
import { AccountClient, type UserProfileData } from './account-client';

export default async function AccountSettingsPage() {
  const session = await requireSession();
  void session; // validates auth

  const profile = await apiFetch<UserProfileData>('/users/me');

  return (
    <div className="flex flex-col gap-6 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-1 pb-2">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Account settings
        </h1>
        <p className="text-xs text-muted-foreground">
          Manage your profile, linked phone number, and account information.
        </p>
      </div>

      <SettingsTabs />

      <AccountClient profile={profile} />
    </div>
  );
}
