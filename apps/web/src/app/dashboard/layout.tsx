import { redirect } from 'next/navigation';

import { getSession } from '../../lib/session';
import { CommandPalette } from '../../components/command-palette';
import { TopBar } from '../../components/top-bar';
import { DashboardNav } from './dashboard-nav';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  return (
    <div className="flex min-h-screen flex-col md:flex-row bg-background">
      <CommandPalette />
      <DashboardNav />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />
        <main className="flex-1 px-4 py-6 sm:px-6 md:px-8 lg:px-10 xl:px-12 w-full min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
}
