'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Plug, Settings, Sliders, Users } from 'lucide-react';

export function SettingsTabs() {
  const pathname = usePathname();

  const tabs = [
    {
      href: '/dashboard/settings/account',
      label: 'Account',
      icon: Settings,
    },
    {
      href: '/dashboard/settings/household',
      label: 'Household & Bot',
      icon: Users,
    },
    {
      href: '/dashboard/settings/integrations',
      label: 'Integrations',
      icon: Plug,
    },
    {
      href: '/dashboard/settings/preferences',
      label: 'Preferences & Config',
      icon: Sliders,
    },
  ];

  return (
    <div className="flex border-b border-border gap-2">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider transition-colors border-b-2 -mb-px ${
              isActive
                ? 'border-primary text-primary font-bold'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
            }`}
          >
            <Icon className="h-4 w-4" />
            <span>{tab.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
