import { JoinInviteCard } from './join-invite-card';

export default async function JoinPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-6">
      <JoinInviteCard token={token} />
    </main>
  );
}
