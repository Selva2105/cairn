import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@cairn/ui';
import { KeyRound, MessageSquare, UserPlus, Users } from 'lucide-react';

import { apiFetch } from '../../../../lib/api-client';
import { requireSession } from '../../../../lib/session';
import { InviteSection } from './invite-section';
import { JoinForm } from './join-form';
import { PhoneForm } from './phone-form';
import { WhatsAppGuide } from './whatsapp-guide';
import { SettingsTabs } from '../settings-tabs';

interface HouseholdMemberRow {
  id: string;
  role: 'OWNER' | 'MEMBER';
  user: { id: string; name: string; email: string };
}

interface HouseholdDetail {
  id: string;
  name: string;
  members: HouseholdMemberRow[];
}

interface UserProfile {
  phone: string | null;
  whatsappConfigured: boolean;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'H';
  if (parts.length === 1) return (parts[0] ?? '').slice(0, 2).toUpperCase();
  const first = parts[0]?.[0] ?? '';
  const last = parts[parts.length - 1]?.[0] ?? '';
  return (first + last).toUpperCase() || 'H';
}

export default async function HouseholdSettingsPage() {
  const session = await requireSession();
  const householdId = session.householdId;

  const [household, me] = await Promise.all([
    apiFetch<HouseholdDetail>(`/households/${householdId}`),
    apiFetch<UserProfile>('/users/me'),
  ]);

  const isConnected = Boolean(me.phone && me.whatsappConfigured);

  return (
    <div className="flex flex-col gap-6 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-1 pb-2">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          {household.name}
        </h1>
        <p className="text-xs text-muted-foreground">
          Manage members, permissions, and WhatsApp assistant settings for this
          household.
        </p>
      </div>

      <SettingsTabs />

      {/* Main Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left Column */}
        <div className="flex flex-col gap-6">
          {/* Members List Card */}
          <Card className="flex flex-col">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Users className="h-4 w-4" />
                  </div>
                  <CardTitle className="text-lg font-semibold">
                    Household members
                  </CardTitle>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {household.members.length}{' '}
                  {household.members.length === 1 ? 'member' : 'members'}
                </Badge>
              </div>
              <CardDescription>
                Everyone who currently has access to documents, tasks, and
                alerts in this household.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="flex flex-col divide-y divide-border">
                {household.members.map((m) => (
                  <li
                    key={m.id}
                    className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-xs font-semibold text-foreground border border-border">
                        {getInitials(m.user.name || m.user.email)}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-foreground">
                          {m.user.name || 'Unnamed member'}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {m.user.email}
                        </span>
                      </div>
                    </div>
                    <Badge
                      variant={m.role === 'OWNER' ? 'default' : 'secondary'}
                      className="text-[11px] uppercase tracking-wider font-mono"
                    >
                      {m.role}
                    </Badge>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* WhatsApp Card */}
          <Card className="flex flex-col">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                      isConnected
                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    <MessageSquare className="h-4 w-4" />
                  </div>
                  <CardTitle className="text-lg font-semibold">
                    WhatsApp Assistant
                  </CardTitle>
                </div>
                <Badge
                  variant={
                    isConnected ? 'success' : me.phone ? 'outline' : 'secondary'
                  }
                  className="text-[10px]"
                >
                  {isConnected
                    ? 'Connected'
                    : me.phone
                      ? 'Saved (Server Offline)'
                      : 'Not Connected'}
                </Badge>
              </div>
              <CardDescription>
                Link your phone number to capture bills and query documents
                directly via WhatsApp message.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PhoneForm currentPhone={me.phone} />
              <WhatsAppGuide
                isConfigured={me.whatsappConfigured}
                hasPhone={Boolean(me.phone)}
                userPhone={me.phone}
                householdId={householdId}
              />
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="flex flex-col gap-6">
          {/* Invite Card */}
          <Card className="flex flex-col">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <UserPlus className="h-4 w-4" />
                </div>
                <CardTitle className="text-lg font-semibold">
                  Invite members
                </CardTitle>
              </div>
              <CardDescription>
                Add another member to collaborate on bills, documents, and
                reminders.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <InviteSection householdId={householdId} />
            </CardContent>
          </Card>

          {/* Join Another Household Card */}
          <Card className="flex flex-col">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <KeyRound className="h-4 w-4" />
                </div>
                <CardTitle className="text-lg font-semibold">
                  Join another household
                </CardTitle>
              </div>
              <CardDescription>
                Enter an invite token shared by an owner of another household.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <JoinForm />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
