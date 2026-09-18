'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  AlertCircle,
  Bell,
  CheckCircle2,
  ChevronRight,
  Clock,
  Command,
  Plus,
  Search,
} from 'lucide-react';
import { Badge, Button, CairnMark } from '@cairn/ui';
import { ThemeToggle } from './theme-toggle';
import { browserApiFetch } from '../lib/api-client-browser';

const ROUTE_NAMES: Record<string, string> = {
  '/dashboard/overview': 'Overview',
  '/dashboard/documents': 'Documents Vault',
  '/dashboard/tasks': 'Tasks & Chores',
  '/dashboard/rules': 'Automations & Rules',
  '/dashboard/settings/household': 'Household Settings',
};

export function TopBar() {
  const pathname = usePathname();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<{
    phone: string | null;
    whatsappConfigured: boolean;
  } | null>(null);

  useEffect(() => {
    browserApiFetch<{ phone: string | null; whatsappConfigured: boolean }>(
      '/users/me',
    )
      .then((data) => setUserProfile(data))
      .catch(() => setUserProfile(null));
  }, []);

  const isPhoneLinked = Boolean(userProfile?.phone);
  const isWhatsAppConfigured = Boolean(userProfile?.whatsappConfigured);
  const isWhatsAppConnected = isPhoneLinked && isWhatsAppConfigured;

  const currentTitle = ROUTE_NAMES[pathname] || 'Dashboard';

  const triggerCommandPalette = () => {
    window.dispatchEvent(new CustomEvent('open-command-palette'));
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between border-b border-border bg-background/80 backdrop-blur-md px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12">
      {/* Breadcrumbs Trail */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Link
          href="/dashboard/overview"
          className="flex items-center gap-1.5 font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <CairnMark size={16} className="shrink-0" />
          <span>Dashboard</span>
        </Link>
        <ChevronRight className="h-3 w-3 opacity-40" />
        <span className="font-semibold text-foreground">{currentTitle}</span>
      </div>

      {/* Right Utility Suite */}
      <div className="flex items-center gap-2 self-end sm:self-auto">
        {/* Quick Search / Command Palette Trigger */}
        <button
          type="button"
          onClick={triggerCommandPalette}
          className="group flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
        >
          <Search className="h-3.5 w-3.5" />
          <span className="hidden md:inline">Quick search...</span>
          <kbd className="flex items-center gap-0.5 rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono text-foreground border border-border">
            <Command className="h-2.5 w-2.5" /> K
          </kbd>
        </button>

        {/* Notifications Popover */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            className="relative flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
            aria-label="Toggle notifications"
          >
            <Bell className="h-3.5 w-3.5" />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary ring-2 ring-card" />
          </button>

          {notificationsOpen && (
            <div
              className="absolute right-0 mt-2 w-80 rounded-xl border border-border bg-card p-4 z-50 duration-150"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-foreground">
                    Notifications
                  </span>
                  <Badge
                    variant={isWhatsAppConnected ? 'success' : 'secondary'}
                    className="text-[10px] px-1.5 py-0"
                  >
                    {isWhatsAppConnected ? 'Live' : 'Standby'}
                  </Badge>
                </div>
                <span className="text-[11px] text-muted-foreground">
                  {isWhatsAppConnected
                    ? 'All systems synced'
                    : 'Setup incomplete'}
                </span>
              </div>

              <div className="py-3 flex flex-col gap-2.5 text-xs">
                {isWhatsAppConnected ? (
                  <div className="flex items-start gap-2.5 rounded-lg p-2.5 bg-muted/40 border border-border">
                    <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
                    <div className="flex flex-col gap-0.5">
                      <span className="font-medium text-foreground">
                        WhatsApp Bot Active
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        Linked to {userProfile?.phone} & alert runner.
                      </span>
                    </div>
                  </div>
                ) : !isPhoneLinked ? (
                  <div className="flex items-start gap-2.5 rounded-lg p-2.5 bg-muted/40 border border-border">
                    <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                    <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-foreground">
                          WhatsApp Not Linked
                        </span>
                        <Link
                          href="/dashboard/settings/household"
                          onClick={() => setNotificationsOpen(false)}
                          className="text-[11px] text-primary hover:underline font-medium"
                        >
                          Connect
                        </Link>
                      </div>
                      <span className="text-[11px] text-muted-foreground">
                        Link your phone in Household Settings to receive
                        notifications.
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-2.5 rounded-lg p-2.5 bg-muted/40 border border-border">
                    <Clock className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <div className="flex flex-col gap-0.5">
                      <span className="font-medium text-foreground">
                        WhatsApp Bot Offline
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        Server API credentials not configured in environment.
                      </span>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-2.5 rounded-lg p-2.5 bg-muted/40 border border-border">
                  <Clock className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                  <div className="flex flex-col gap-0.5">
                    <span className="font-medium text-foreground">
                      Expiration Engine
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      Scanning vital document dates daily at midnight.
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-border flex justify-between items-center text-[11px]">
                <Link
                  href="/dashboard/overview"
                  onClick={() => setNotificationsOpen(false)}
                  className="text-primary hover:underline font-medium"
                >
                  View full activity log
                </Link>
                <button
                  type="button"
                  onClick={() => setNotificationsOpen(false)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Global Theme Toggle */}
        <ThemeToggle />

        {/* Quick Action Button */}
        <Button
          size="sm"
          className="gap-1.5 text-xs font-semibold"
          onClick={triggerCommandPalette}
        >
          <Plus className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Action</span>
        </Button>
      </div>
    </header>
  );
}
