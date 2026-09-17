'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  CheckSquare,
  Command,
  FileText,
  LayoutDashboard,
  Menu,
  Search,
  Settings,
  ShieldCheck,
  Sliders,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import { Badge } from '@cairn/ui';

import { ThemeToggle } from '../../components/theme-toggle';
import { LogoutButton } from './logout-button';
import { browserApiFetch } from '../../lib/api-client-browser';

const MAIN_NAV = [
  {
    href: '/dashboard/overview',
    label: 'Overview',
    icon: LayoutDashboard,
    badge: null,
  },
  {
    href: '/dashboard/documents',
    label: 'Documents',
    icon: FileText,
    badge: 'Vault',
  },
  { href: '/dashboard/tasks', label: 'Tasks', icon: CheckSquare, badge: null },
  {
    href: '/dashboard/rules',
    label: 'Automations',
    icon: Sliders,
    badge: 'Active',
  },
];

const SETTINGS_NAV = [
  {
    href: '/dashboard/settings/account',
    label: 'Account',
    icon: Settings,
    badge: null,
  },
  {
    href: '/dashboard/settings/household',
    label: 'Household & Bot',
    icon: Users,
    badge: null,
  },
  {
    href: '/dashboard/settings/preferences',
    label: 'Config & Preferences',
    icon: Sliders,
    badge: 'Config',
  },
];

function getInitials(name: string, email: string): string {
  const src = name?.trim() || email;
  const parts = src.split(/[\s@]/).filter(Boolean);
  if (parts.length >= 2)
    return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase();
  return (parts[0] ?? '').slice(0, 2).toUpperCase() || '?';
}

export function DashboardNav() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<{
    name: string;
    email: string;
    phone: string | null;
  } | null>(null);

  useEffect(() => {
    browserApiFetch<{ name: string; email: string; phone: string | null }>(
      '/users/me',
    )
      .then(setUserProfile)
      .catch(() => null);
  }, []);

  const displayName =
    userProfile?.name || userProfile?.email?.split('@')[0] || 'User';
  const displayEmail = userProfile?.email || '';
  const initials = userProfile
    ? getInitials(userProfile.name, userProfile.email)
    : '…';

  const triggerCommandPalette = () => {
    window.dispatchEvent(new CustomEvent('open-command-palette'));
  };

  return (
    <>
      {/* Mobile Top Header - Clean hairline border, zero shadows */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-border bg-background/95 backdrop-blur-md px-4 py-3 md:hidden">
        <Link
          href="/dashboard/overview"
          className="flex items-center gap-2.5 font-semibold text-foreground tracking-tight"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Sparkles className="h-4 w-4" />
          </div>
          <span className="text-base font-semibold">Cairn</span>
        </Link>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={triggerCommandPalette}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background text-foreground transition-colors hover:bg-muted"
            aria-label="Open command palette"
          >
            <Search className="h-4 w-4" />
          </button>
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? (
              <X className="h-4 w-4" />
            ) : (
              <Menu className="h-4 w-4" />
            )}
          </button>
        </div>
      </header>

      {/* Mobile Menu Dropdown / Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-30 bg-background/80 backdrop-blur-sm md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div
            className="absolute top-14 inset-x-3 rounded-xl border border-border bg-card p-4 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col gap-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-2">
                  Main
                </span>
                <nav className="mt-1 flex flex-col gap-1">
                  {MAIN_NAV.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                          isActive
                            ? 'bg-primary/10 text-primary border border-primary/20'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Icon className="h-4 w-4 shrink-0" />
                          <span>{item.label}</span>
                        </div>
                        {item.badge && (
                          <Badge
                            variant="secondary"
                            className="text-[10px] py-0 px-1.5"
                          >
                            {item.badge}
                          </Badge>
                        )}
                      </Link>
                    );
                  })}
                </nav>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-2">
                  Settings
                </span>
                <nav className="mt-1 flex flex-col gap-1">
                  {SETTINGS_NAV.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                          isActive
                            ? 'bg-primary/10 text-primary border border-primary/20'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Icon className="h-4 w-4 shrink-0" />
                          <span>{item.label}</span>
                        </div>
                      </Link>
                    );
                  })}
                </nav>
              </div>

              <div className="pt-3 border-t border-border flex items-center justify-between">
                <LogoutButton />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Docked Minimal Sidebar - Clean hairline border, zero shadows */}
      <aside className="hidden md:flex w-64 lg:w-72 shrink-0 flex-col border-r border-border bg-card/30 dark:bg-card/20 min-h-screen">
        <div className="sticky top-0 flex h-screen flex-col justify-between p-4 lg:p-6 overflow-y-auto">
          <div className="flex flex-col gap-6">
            {/* Workspace / Household Header */}
            <div className="flex items-center justify-between rounded-xl border border-border bg-background p-2.5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
                  C
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-foreground tracking-tight">
                      My Household
                    </span>
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    Cairn Operations
                  </span>
                </div>
              </div>
              <Badge
                variant="secondary"
                className="text-[10px] font-semibold uppercase px-1.5 py-0"
              >
                PRO
              </Badge>
            </div>

            {/* Quick Command Palette Button */}
            <button
              type="button"
              onClick={triggerCommandPalette}
              className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2 text-xs text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
            >
              <div className="flex items-center gap-2">
                <Search className="h-3.5 w-3.5" />
                <span>Search or jump to...</span>
              </div>
              <kbd className="flex items-center gap-0.5 rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono border border-border text-foreground">
                <Command className="h-2.5 w-2.5" /> K
              </kbd>
            </button>

            {/* Main Navigation Section */}
            <div className="flex flex-col gap-1">
              <span className="px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Workspace
              </span>
              <nav className="mt-1 flex flex-col gap-1">
                {MAIN_NAV.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`group flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                        isActive
                          ? 'bg-primary/10 text-primary border border-primary/20 font-semibold'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon
                          className={`h-4 w-4 shrink-0 transition-colors ${
                            isActive
                              ? 'text-primary'
                              : 'text-muted-foreground group-hover:text-foreground'
                          }`}
                        />
                        <span>{item.label}</span>
                      </div>
                      {item.badge && (
                        <Badge
                          variant={isActive ? 'default' : 'secondary'}
                          className="text-[10px] py-0 px-1.5 font-mono"
                        >
                          {item.badge}
                        </Badge>
                      )}
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* Settings Section */}
            <div className="flex flex-col gap-1">
              <span className="px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Administration
              </span>
              <nav className="mt-1 flex flex-col gap-1">
                {SETTINGS_NAV.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`group flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                        isActive
                          ? 'bg-primary/10 text-primary border border-primary/20 font-semibold'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon
                          className={`h-4 w-4 shrink-0 transition-colors ${
                            isActive
                              ? 'text-primary'
                              : 'text-muted-foreground group-hover:text-foreground'
                          }`}
                        />
                        <span>{item.label}</span>
                      </div>
                    </Link>
                  );
                })}
              </nav>
            </div>
          </div>

          {/* Bottom User Card & Controls */}
          <div className="flex flex-col gap-3 pt-3 border-t border-border">
            {/* User Profile Pill */}
            <Link
              href="/dashboard/settings/account"
              className="flex items-center justify-between rounded-lg border border-border bg-background p-2 transition-colors hover:bg-muted group"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/15 font-semibold text-xs text-primary">
                  {initials}
                  <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-500 ring-1 ring-background" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-medium text-foreground leading-tight truncate">
                    {displayName}
                  </span>
                  <span className="text-[10px] text-muted-foreground leading-none truncate">
                    {displayEmail}
                  </span>
                </div>
              </div>
              <ShieldCheck className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
            </Link>

            <LogoutButton />
          </div>
        </div>
      </aside>
    </>
  );
}
