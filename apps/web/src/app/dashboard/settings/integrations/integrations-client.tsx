'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@cairn/ui';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  ExternalLink,
  Mail,
  MessageSquare,
  Power,
  RefreshCw,
  ScanLine,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';

import { browserApiFetch } from '../../../../lib/api-client-browser';
import { WhatsAppSimulatorDialog } from '../../../../components/whatsapp-simulator-dialog';

export interface ConnectorStatusItem {
  key: string;
  name: string;
  description: string;
  connected: boolean;
  enabled: boolean;
  accountEmail: string | null;
  lastRunAt: string | null;
  authType: 'oauth' | 'webhook' | 'client';
}

interface IntegrationsClientProps {
  householdId: string;
  initialConnectors: ConnectorStatusItem[];
}

export function IntegrationsClient({
  householdId,
  initialConnectors,
}: IntegrationsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [connectors, setConnectors] =
    useState<ConnectorStatusItem[]>(initialConnectors);
  const [isSyncing, setIsSyncing] = useState<Record<string, boolean>>({});
  const [isConnecting, setIsConnecting] = useState<Record<string, boolean>>({});
  const [isToggling, setIsToggling] = useState<Record<string, boolean>>({});
  const [simulatorOpen, setSimulatorOpen] = useState(false);

  // URL query param feedback
  const connectedParam = searchParams.get('connected');
  const errorParam = searchParams.get('error');

  const refreshConnectors = async () => {
    try {
      const updated = await browserApiFetch<ConnectorStatusItem[]>(
        `/households/${householdId}/connectors`,
      );
      setConnectors(updated);
    } catch {
      // silently keep current state
    }
  };

  const handleConnect = async (connectorKey: 'GMAIL' | 'CALENDAR') => {
    setIsConnecting((prev) => ({ ...prev, [connectorKey]: true }));
    try {
      const { url } = await browserApiFetch<{ url: string }>(
        `/households/${householdId}/connectors/google/auth-url?connector=${connectorKey}`,
      );
      window.location.href = url;
    } catch (err: unknown) {
      toast.error('Failed to initiate Google authorization. Please try again.');
      setIsConnecting((prev) => ({ ...prev, [connectorKey]: false }));
    }
  };

  const handleToggle = async (
    connectorKey: string,
    currentEnabled: boolean,
  ) => {
    setIsToggling((prev) => ({ ...prev, [connectorKey]: true }));
    try {
      await browserApiFetch(
        `/households/${householdId}/connectors/${connectorKey}/toggle`,
        {
          method: 'PATCH',
          body: JSON.stringify({ enabled: !currentEnabled }),
        },
      );
      setConnectors((prev) =>
        prev.map((c) =>
          c.key === connectorKey ? { ...c, enabled: !currentEnabled } : c,
        ),
      );
      toast.success(
        !currentEnabled
          ? `${connectorKey} connector enabled`
          : `${connectorKey} connector paused`,
      );
      router.refresh();
    } catch (err: unknown) {
      toast.error('Failed to update connector status');
    } finally {
      setIsToggling((prev) => ({ ...prev, [connectorKey]: false }));
    }
  };

  const handleDisconnect = async (connectorKey: string) => {
    if (
      !confirm(
        `Are you sure you want to disconnect ${connectorKey}? Stored OAuth tokens will be removed.`,
      )
    ) {
      return;
    }

    try {
      await browserApiFetch(
        `/households/${householdId}/connectors/${connectorKey}`,
        {
          method: 'DELETE',
        },
      );
      toast.success(`Disconnected ${connectorKey}`);
      await refreshConnectors();
      router.refresh();
    } catch (err: unknown) {
      toast.error(`Failed to disconnect ${connectorKey}`);
    }
  };

  const handleSync = async (connectorKey: string) => {
    setIsSyncing((prev) => ({ ...prev, [connectorKey]: true }));
    try {
      const result = await browserApiFetch<{
        key: string;
        ingested: number;
        skipped: number;
        totalSignals: number;
      }>(`/households/${householdId}/connectors/${connectorKey}/sync`, {
        method: 'POST',
      });

      toast.success(
        `Sync complete: ${result.ingested} new signals ingested, ${result.skipped} deduplicated (${result.totalSignals} scanned).`,
      );
      await refreshConnectors();
      router.refresh();
    } catch (err: unknown) {
      toast.error(`Failed to sync ${connectorKey}. Please verify credentials.`);
    } finally {
      setIsSyncing((prev) => ({ ...prev, [connectorKey]: false }));
    }
  };

  const gmail = connectors.find((c) => c.key === 'GMAIL');
  const calendar = connectors.find((c) => c.key === 'CALENDAR');
  const whatsapp = connectors.find((c) => c.key === 'WHATSAPP');
  const ocr = connectors.find((c) => c.key === 'OCR');

  return (
    <div className="space-y-6">
      {/* Alert Notifications */}
      {connectedParam && (
        <div className="flex items-center gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-800 dark:text-emerald-300">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
          <span>
            <strong>Success:</strong> {connectedParam.toUpperCase()} has been
            connected to your household! Ingestion runs automatically via the
            background worker pipeline.
          </span>
        </div>
      )}

      {errorParam && (
        <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-xs text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />
          <span>
            <strong>Connection Error:</strong>{' '}
            {errorParam === 'oauth_denied'
              ? 'Google authorization was denied or cancelled.'
              : 'Failed to complete Google OAuth connection. Please verify server client credentials.'}
          </span>
        </div>
      )}

      {/* Overview Banner */}
      <Card className="border border-border bg-card shadow-none">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
            <RefreshCw className="h-4 w-4 text-primary" />
            Automated Ingestion Pipeline
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Cairn continuously monitors authenticated accounts for bill
            statements, maintenance events, and tasks. Raw signals are parsed,
            deduplicated, and passed through your household rules engine.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Connectors Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Google Gmail Connector */}
        <Card className="border border-border bg-card shadow-none flex flex-col justify-between">
          <div>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
                    <Mail className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-semibold text-foreground">
                      Google Gmail
                    </CardTitle>
                    <p className="text-[11px] text-muted-foreground">
                      Utility bills & invoices
                    </p>
                  </div>
                </div>

                {/* Status Badge */}
                {gmail?.connected ? (
                  gmail.enabled ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                      Paused
                    </span>
                  )
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                    Disconnected
                  </span>
                )}
              </div>

              <CardDescription className="text-xs text-muted-foreground pt-2">
                {gmail?.description ||
                  'Scans your mailbox for incoming utility bills, invoices, and statements (matching label:bills or invoice keywords).'}
              </CardDescription>
            </CardHeader>

            <CardContent className="pt-0 space-y-3">
              {gmail?.connected ? (
                <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Account:</span>
                    <span className="font-medium text-foreground font-mono text-[11px]">
                      {gmail.accountEmail || 'Authorized Account'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Last Scanned:</span>
                    <span className="text-foreground">
                      {gmail.lastRunAt
                        ? new Date(gmail.lastRunAt).toLocaleString()
                        : 'Scheduled next minute'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Scope:</span>
                    <span className="text-muted-foreground font-mono text-[10px]">
                      gmail.readonly
                    </span>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-border p-3 text-center text-xs text-muted-foreground">
                  Connect your Google account to automatically import bills
                  without manual data entry.
                </div>
              )}
            </CardContent>
          </div>

          <div className="p-4 pt-0 border-t border-border flex items-center justify-between gap-2 mt-4">
            {gmail?.connected ? (
              <>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleToggle('GMAIL', gmail.enabled)}
                    disabled={isToggling['GMAIL']}
                    className="h-8 text-xs border-border shadow-none gap-1.5"
                  >
                    <Power className="h-3 w-3" />
                    {gmail.enabled ? 'Pause' : 'Resume'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleSync('GMAIL')}
                    disabled={isSyncing['GMAIL'] || !gmail.enabled}
                    className="h-8 text-xs border-border shadow-none gap-1.5"
                  >
                    <RefreshCw
                      className={`h-3 w-3 ${isSyncing['GMAIL'] ? 'animate-spin' : ''}`}
                    />
                    Sync Now
                  </Button>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDisconnect('GMAIL')}
                  className="h-8 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 gap-1.5"
                >
                  <Trash2 className="h-3 w-3" />
                  Disconnect
                </Button>
              </>
            ) : (
              <Button
                type="button"
                size="sm"
                onClick={() => handleConnect('GMAIL')}
                disabled={isConnecting['GMAIL']}
                className="w-full h-8 text-xs shadow-none gap-1.5 bg-primary text-primary-foreground font-medium"
              >
                <Mail className="h-3.5 w-3.5" />
                {isConnecting['GMAIL']
                  ? 'Redirecting to Google...'
                  : 'Connect Google Gmail'}
              </Button>
            )}
          </div>
        </Card>
        {/* Google Calendar Connector */}
        <Card className="border border-border bg-card shadow-none flex flex-col justify-between">
          <div>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                    <Calendar className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-semibold text-foreground">
                      Google Calendar
                    </CardTitle>
                    <p className="text-[11px] text-muted-foreground">
                      Maintenance & inspection signals
                    </p>
                  </div>
                </div>

                {/* Status Badge */}
                {calendar?.connected ? (
                  calendar.enabled ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                      Paused
                    </span>
                  )
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                    Disconnected
                  </span>
                )}
              </div>

              <CardDescription className="text-xs text-muted-foreground pt-2">
                {calendar?.description ||
                  'Scans your primary calendar for maintenance tasks (HVAC, vehicle service, inspections, pest control) and syncs upcoming dates.'}
              </CardDescription>
            </CardHeader>

            <CardContent className="pt-0 space-y-3">
              {calendar?.connected ? (
                <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Account:</span>
                    <span className="font-medium text-foreground font-mono text-[11px]">
                      {calendar.accountEmail || 'Authorized Account'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Last Scanned:</span>
                    <span className="text-foreground">
                      {calendar.lastRunAt
                        ? new Date(calendar.lastRunAt).toLocaleString()
                        : 'Scheduled next minute'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Scope:</span>
                    <span className="text-muted-foreground font-mono text-[10px]">
                      calendar.readonly
                    </span>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-border p-3 text-center text-xs text-muted-foreground">
                  Connect your Google account to convert calendar events with
                  keywords into household maintenance tasks.
                </div>
              )}
            </CardContent>
          </div>

          <div className="p-4 pt-0 border-t border-border flex items-center justify-between gap-2 mt-4">
            {calendar?.connected ? (
              <>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleToggle('CALENDAR', calendar.enabled)}
                    disabled={isToggling['CALENDAR']}
                    className="h-8 text-xs border-border shadow-none gap-1.5"
                  >
                    <Power className="h-3 w-3" />
                    {calendar.enabled ? 'Pause' : 'Resume'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleSync('CALENDAR')}
                    disabled={isSyncing['CALENDAR'] || !calendar.enabled}
                    className="h-8 text-xs border-border shadow-none gap-1.5"
                  >
                    <RefreshCw
                      className={`h-3 w-3 ${isSyncing['CALENDAR'] ? 'animate-spin' : ''}`}
                    />
                    Sync Now
                  </Button>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDisconnect('CALENDAR')}
                  className="h-8 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 gap-1.5"
                >
                  <Trash2 className="h-3 w-3" />
                  Disconnect
                </Button>
              </>
            ) : (
              <Button
                type="button"
                size="sm"
                onClick={() => handleConnect('CALENDAR')}
                disabled={isConnecting['CALENDAR']}
                className="w-full h-8 text-xs shadow-none gap-1.5 bg-primary text-primary-foreground font-medium"
              >
                <Calendar className="h-3.5 w-3.5" />
                {isConnecting['CALENDAR']
                  ? 'Redirecting to Google...'
                  : 'Connect Google Calendar'}
              </Button>
            )}
          </div>
        </Card>

        {/* WhatsApp Household Assistant */}
        <Card className="border border-border bg-card shadow-none flex flex-col justify-between">
          <div>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    <MessageSquare className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-semibold text-foreground">
                      WhatsApp Assistant
                    </CardTitle>
                    <p className="text-[11px] text-muted-foreground">
                      Interactive conversational gateway
                    </p>
                  </div>
                </div>

                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Active
                </span>
              </div>

              <CardDescription className="text-xs text-muted-foreground pt-2">
                {whatsapp?.description ||
                  'Two-way interactive messaging bot with interactive buttons, quick due dates, status digests, and natural grammar entry.'}
              </CardDescription>
            </CardHeader>

            <CardContent className="pt-0 space-y-3">
              <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Engine:</span>
                  <span className="font-medium text-foreground">
                    Meta Graph API & Chat Wizard
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Features:</span>
                  <span className="text-foreground">
                    Quick-Reply Buttons & Status Reports
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Simulator:</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                    Ready for live preview
                  </span>
                </div>
              </div>
            </CardContent>
          </div>

          <div className="p-4 pt-0 border-t border-border flex items-center justify-between gap-2 mt-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSimulatorOpen(true)}
              className="h-8 text-xs border-border shadow-none gap-1.5"
            >
              <MessageSquare className="h-3 w-3 text-emerald-500" />
              Launch Simulator
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => router.push('/dashboard/settings/household')}
              className="h-8 text-xs text-muted-foreground hover:text-foreground gap-1.5"
            >
              Configure Phone
              <ExternalLink className="h-3 w-3" />
            </Button>
          </div>
        </Card>

        {/* Optical Character Recognition (OCR) */}
        <Card className="border border-border bg-card shadow-none flex flex-col justify-between">
          <div>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                    <ScanLine className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-semibold text-foreground">
                      Receipt & Document OCR
                    </CardTitle>
                    <p className="text-[11px] text-muted-foreground">
                      Tesseract.js OCR engine
                    </p>
                  </div>
                </div>

                <span className="inline-flex items-center gap-1.5 rounded-full border border-purple-500/30 bg-purple-500/10 px-2.5 py-0.5 text-[11px] font-medium text-purple-700 dark:text-purple-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />
                  Ready
                </span>
              </div>

              <CardDescription className="text-xs text-muted-foreground pt-2">
                {ocr?.description ||
                  'Optical Character Recognition powered by Tesseract.js. Extracts totals, dates, and vendors from uploaded receipt photos and paperwork.'}
              </CardDescription>
            </CardHeader>

            <CardContent className="pt-0 space-y-3">
              <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Engine:</span>
                  <span className="font-medium text-foreground">
                    Tesseract.js v5 (Self-hosted)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Parsing:</span>
                  <span className="text-foreground">
                    Heuristic Total, Date & Vendor Extractor
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Trigger:</span>
                  <span className="text-foreground">
                    On-demand file upload / scanner
                  </span>
                </div>
              </div>
            </CardContent>
          </div>

          <div className="p-4 pt-0 border-t border-border flex items-center justify-between gap-2 mt-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => router.push('/dashboard/documents')}
              className="h-8 text-xs border-border shadow-none gap-1.5"
            >
              <ScanLine className="h-3 w-3" />
              Upload Document
            </Button>
          </div>
        </Card>
      </div>

      {/* WhatsApp Simulator Modal */}
      <WhatsAppSimulatorDialog
        householdId={householdId}
        isOpen={simulatorOpen}
        onClose={() => setSimulatorOpen(false)}
      />
    </div>
  );
}
