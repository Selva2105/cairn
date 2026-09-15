import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@cairn/ui';

import { apiFetch } from '../../../../lib/api-client';
import { requireSession } from '../../../../lib/session';
import { InviteSection } from './invite-section';
import { JoinForm } from './join-form';
import { PhoneForm } from './phone-form';

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
}

export default async function HouseholdSettingsPage() {
  const session = await requireSession();
  const householdId = session.householdId;

  const [household, me] = await Promise.all([
    apiFetch<HouseholdDetail>(`/households/${householdId}`),
    apiFetch<UserProfile>('/users/me'),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Household settings</h1>

      <Card>
        <CardHeader>
          <CardTitle>{household.name}</CardTitle>
          <CardDescription>Members of your household.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="flex flex-col gap-2">
            {household.members.map((member) => (
              <li
                key={member.id}
                className="flex items-center justify-between rounded-md border p-3"
              >
                <div>
                  <p className="text-sm font-medium">{member.user.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {member.user.email}
                  </p>
                </div>
                <Badge
                  variant={member.role === 'OWNER' ? 'default' : 'secondary'}
                >
                  {member.role}
                </Badge>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Invite a member</CardTitle>
          <CardDescription>
            Generate a link for someone to join this household.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <InviteSection householdId={householdId} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Join another household</CardTitle>
          <CardDescription>
            Paste an invite token someone shared with you.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <JoinForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>WhatsApp</CardTitle>
          <CardDescription>
            Link a number to log bills and documents by message.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PhoneForm currentPhone={me.phone} />
        </CardContent>
      </Card>
    </div>
  );
}
