import { redirect } from 'next/navigation';
import Link from 'next/link';

import { getSession } from '../../lib/session';
import { LogoutButton } from './logout-button';

const NAV_ITEMS = [
  { href: '/dashboard/overview', label: 'Overview' },
  { href: '/dashboard/documents', label: 'Documents' },
  { href: '/dashboard/settings/household', label: 'Household' },
];

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
    <div className="flex min-h-screen">
      <aside className="w-56 shrink-0 border-r bg-card p-4">
        <div className="mb-6 text-lg font-semibold text-primary">Cairn</div>
        <nav className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="mt-6">
          <LogoutButton />
        </div>
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
