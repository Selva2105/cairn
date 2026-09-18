import { CairnMark } from '@cairn/ui';

import { ThemeToggle } from '../../components/theme-toggle';
import { JoinInviteCard } from './join-invite-card';

export default async function JoinPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center p-4 sm:p-6">
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-sm flex flex-col items-center gap-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <CairnMark size={40} />
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            Cairn
          </h1>
          <p className="text-xs text-muted-foreground">
            Household operations platform
          </p>
        </div>

        <JoinInviteCard token={token} />
      </div>
    </main>
  );
}
