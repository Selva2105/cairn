'use client';

import { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Receipt,
  FileText,
  Bell,
  CheckCircle2,
  HelpCircle,
  Copy,
  Check,
  Smartphone,
  SendHorizontal,
} from 'lucide-react';
import { Badge, Button } from '@cairn/ui';
import { toast } from 'sonner';

interface WhatsAppGuideProps {
  isConfigured: boolean;
  hasPhone: boolean;
  userPhone: string | null;
}

export function WhatsAppGuide({
  isConfigured,
  hasPhone,
  userPhone,
}: WhatsAppGuideProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const copyCommand = (cmd: string, index: number) => {
    navigator.clipboard.writeText(cmd);
    setCopiedIndex(index);
    toast.success(`Copied: "${cmd}"`);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const commands = [
    {
      title: 'Log a Bill & Create Payment Task',
      command: 'bill Electricity 1200 15-Oct',
      explanation:
        'Format: bill <Vendor> <Amount> <Due Date>. Cairn parses the bill and creates a scheduled payment task automatically.',
      icon: Receipt,
      category: 'Bills & Tasks',
    },
    {
      title: 'Create a Household Task / Chore',
      command: 'task Fix the leaking water tap',
      explanation:
        'Format: task <Description>. Instantly adds a shared duty to your Tasks & Chores board.',
      icon: CheckCircle2,
      category: 'Tasks',
    },
    {
      title: 'Track Document Expiry',
      command: 'doc passport 2027-03-01',
      explanation:
        'Format: doc <Label> <Expiration Date>. Cairn logs the document and creates a renewal task before expiry.',
      icon: FileText,
      category: 'Documents',
    },
    {
      title: 'Photo Receipt Capture',
      command: 'Send any receipt photo/PDF',
      explanation:
        'Upload or snap a photo in chat. Cairn extracts line items, tax, and payment dates automatically.',
      icon: Smartphone,
      category: 'OCR',
    },
  ];

  return (
    <div className="mt-4 flex flex-col rounded-lg border border-border bg-muted/20 overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between p-3 text-left hover:bg-muted/40 transition-colors"
      >
        <div className="flex items-center gap-2">
          <HelpCircle className="h-4 w-4 text-primary" />
          <span className="text-xs font-semibold text-foreground">
            How WhatsApp Assistant works &amp; How to connect
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px] font-normal py-0">
            {isOpen ? 'Collapse guide' : 'View instructions'}
          </Badge>
          {isOpen ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {isOpen && (
        <div className="flex flex-col gap-4 border-t border-border p-4 text-xs">
          {/* Connection Steps */}
          <div>
            <h4 className="font-semibold text-foreground mb-2 flex items-center gap-1.5">
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary/20 text-[10px] text-primary font-bold">
                1
              </span>
              How to Connect in 3 Simple Steps
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="rounded-md border border-border bg-card p-2.5 flex flex-col gap-1">
                <div className="flex items-center gap-1.5 text-foreground font-medium">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  <span>Step 1: Save Number</span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Select your country code and save your active WhatsApp phone
                  number in the form above.
                </p>
              </div>

              <div className="rounded-md border border-border bg-card p-2.5 flex flex-col gap-1">
                <div className="flex items-center gap-1.5 text-foreground font-medium">
                  <SendHorizontal className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span>Step 2: Message Cairn</span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Send any message or command from your phone to Cairn&apos;s
                  verified WhatsApp business line.
                </p>
              </div>

              <div className="rounded-md border border-border bg-card p-2.5 flex flex-col gap-1">
                <div className="flex items-center gap-1.5 text-foreground font-medium">
                  <Bell className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                  <span>Step 3: Auto-Sync</span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Cairn links your incoming message to your household and
                  replies with instant confirmation.
                </p>
              </div>
            </div>
          </div>

          {/* Commands Guide */}
          <div>
            <h4 className="font-semibold text-foreground mb-2 flex items-center gap-1.5">
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary/20 text-[10px] text-primary font-bold">
                2
              </span>
              Supported Chat Commands
            </h4>
            <div className="space-y-2">
              {commands.map((c, idx) => {
                const Icon = c.icon;
                return (
                  <div
                    key={c.title}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-md border border-border bg-card p-2.5"
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded bg-muted text-muted-foreground">
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground">
                            {c.title}
                          </span>
                          <span className="text-[10px] text-muted-foreground border border-border px-1 rounded">
                            {c.category}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          {c.explanation}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 self-end sm:self-center">
                      <code className="rounded bg-muted px-2 py-1 font-mono text-[11px] text-foreground border border-border">
                        {c.command}
                      </code>
                      {c.command.startsWith('bill') ||
                      c.command.startsWith('doc') ||
                      c.command.startsWith('task') ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => copyCommand(c.command, idx)}
                          title="Copy example"
                        >
                          {copiedIndex === idx ? (
                            <Check className="h-3.5 w-3.5 text-emerald-500" />
                          ) : (
                            <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                          )}
                        </Button>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Server Config & Automated Reminders */}
          <div className="rounded-md border border-border/80 bg-background/50 p-3">
            <h4 className="font-semibold text-foreground mb-1">
              Proactive Reminders &amp; Automation
            </h4>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Once connected, Cairn automatically dispatches reminders to your
              WhatsApp at <strong>30 days</strong>, <strong>14 days</strong>,
              and <strong>1 day</strong> before critical bills or documents
              expire.
              {!isConfigured && (
                <span className="block mt-1 text-amber-600 dark:text-amber-400 font-medium">
                  Note: The server administrator must configure Meta WhatsApp
                  credentials (
                  <code className="text-[10px] bg-muted px-1 py-0.5 rounded">
                    WHATSAPP_ACCESS_TOKEN
                  </code>{' '}
                  &amp;{' '}
                  <code className="text-[10px] bg-muted px-1 py-0.5 rounded">
                    WHATSAPP_PHONE_NUMBER_ID
                  </code>
                  ) for live messaging.
                </span>
              )}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
