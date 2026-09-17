'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge, Button, Input } from '@cairn/ui';
import { Bot, CheckCheck, RotateCcw, Send, Sparkles, X } from 'lucide-react';
import { toast } from 'sonner';

import { browserApiFetch } from '../lib/api-client-browser';

interface ChatMessage {
  id: string;
  sender: 'bot' | 'user';
  text: string;
  interactive?:
    | {
        type: 'button' | 'list';
        buttons?: { id: string; title: string }[];
      }
    | undefined;
  createdEntitySummary?: string | undefined;
  time: string;
}

interface WhatsAppSimulatorDialogProps {
  householdId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function WhatsAppSimulatorDialog({
  householdId,
  isOpen,
  onClose,
}: WhatsAppSimulatorDialogProps) {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-init',
      sender: 'bot',
      text: '👋 *Hi there!* Welcome to Cairn Assistant.\n\nI can help manage your household tasks, upcoming bills, and document renewals.\n\nChoose an action below to get started:',
      interactive: {
        type: 'button',
        buttons: [
          { id: 'ACTION_ADD_BILL', title: '💸 Add Bill' },
          { id: 'ACTION_ADD_TASK', title: '✅ Add Task' },
          { id: 'ACTION_STATUS', title: '📊 Status' },
        ],
      },
      time: 'Now',
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sendMessage = async (text: string, buttonId?: string) => {
    if (!text.trim() && !buttonId) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: text.trim(),
      time: new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);

    try {
      const response = await browserApiFetch<{
        replyText: string;
        interactive?: {
          type: 'button' | 'list';
          buttons?: { id: string; title: string }[];
        };
        createdEntities?: {
          bill?: { vendor: string; amount: number };
          task?: { description: string };
          document?: { label: string };
        };
      }>(`/households/${householdId}/whatsapp/simulate`, {
        method: 'POST',
        body: JSON.stringify({
          text: text.trim(),
          ...(buttonId ? { buttonId } : {}),
        }),
      });

      let summary: string | undefined;
      if (response.createdEntities?.bill) {
        summary = `✨ Created Bill: ${response.createdEntities.bill.vendor} (₹${response.createdEntities.bill.amount})`;
        router.refresh();
      } else if (response.createdEntities?.task) {
        summary = `✨ Created Chore: ${response.createdEntities.task.description}`;
        router.refresh();
      } else if (response.createdEntities?.document) {
        summary = `✨ Tracked Document: ${response.createdEntities.document.label}`;
        router.refresh();
      }

      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: response.replyText,
        interactive: response.interactive,
        createdEntitySummary: summary,
        time: new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch {
      toast.error('Simulation error: Could not reach assistant endpoint');
      setMessages((prev) => [
        ...prev,
        {
          id: `bot-err-${Date.now()}`,
          sender: 'bot',
          text: '⚠️ Simulator connection error. Please try again.',
          time: 'Now',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = async () => {
    setIsLoading(true);
    try {
      await browserApiFetch(`/households/${householdId}/whatsapp/simulate`, {
        method: 'POST',
        body: JSON.stringify({ text: 'cancel' }),
      });
    } catch {
      // Ignore reset failure
    } finally {
      setMessages([
        {
          id: `msg-${Date.now()}`,
          sender: 'bot',
          text: '👋 *Hi there!* Welcome to Cairn Assistant.\n\nChoose an action below to get started:',
          interactive: {
            type: 'button',
            buttons: [
              { id: 'ACTION_ADD_BILL', title: '💸 Add Bill' },
              { id: 'ACTION_ADD_TASK', title: '✅ Add Task' },
              { id: 'ACTION_STATUS', title: '📊 Status' },
            ],
          },
          time: 'Now',
        },
      ]);
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="flex flex-col w-full max-w-md h-[620px] rounded-xl border border-border bg-card shadow-none overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/40">
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <Bot className="w-4 h-4" />
              <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-background" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-foreground">
                  Cairn WhatsApp Assistant
                </span>
                <Badge
                  variant="outline"
                  className="text-[10px] py-0 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                >
                  Interactive Simulator
                </Badge>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Zero Meta token required • Live DB actions
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
              title="Reset conversation"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Message Thread */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/10">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${
                msg.sender === 'user' ? 'items-end' : 'items-start'
              }`}
            >
              <div
                className={`max-w-[85%] rounded-lg px-3 py-2 text-xs leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-primary text-primary-foreground font-medium rounded-br-none'
                    : 'bg-card border border-border text-card-foreground rounded-bl-none'
                }`}
              >
                {/* Formatted Message Body */}
                <div className="whitespace-pre-line">
                  {msg.text.split('\n').map((line, i) => (
                    <span key={i}>
                      {line.startsWith('*') && line.endsWith('*') ? (
                        <strong>{line.replace(/\*/g, '')}</strong>
                      ) : (
                        line
                      )}
                      {i < msg.text.split('\n').length - 1 && <br />}
                    </span>
                  ))}
                </div>

                {/* Entity Created Banner */}
                {msg.createdEntitySummary && (
                  <div className="mt-2 pt-2 border-t border-emerald-500/20 flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                    <Sparkles className="w-3 h-3" />
                    <span>{msg.createdEntitySummary}</span>
                  </div>
                )}

                <div
                  className={`mt-1 flex items-center justify-end gap-1 text-[9px] ${
                    msg.sender === 'user'
                      ? 'text-primary-foreground/70'
                      : 'text-muted-foreground'
                  }`}
                >
                  <span>{msg.time}</span>
                  {msg.sender === 'user' && (
                    <CheckCheck className="w-3 h-3 text-primary-foreground/80" />
                  )}
                </div>
              </div>

              {/* Native WhatsApp Interactive Buttons */}
              {msg.interactive?.type === 'button' &&
                msg.interactive.buttons &&
                msg.interactive.buttons.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1.5 max-w-[85%]">
                    {msg.interactive.buttons.map((btn) => (
                      <Button
                        key={btn.id}
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={isLoading}
                        onClick={() => sendMessage(btn.title, btn.id)}
                        className="h-7 text-[11px] px-2.5 py-0 bg-card hover:bg-primary/10 hover:text-primary hover:border-primary/40 border-border text-foreground transition-all"
                      >
                        {btn.title}
                      </Button>
                    ))}
                  </div>
                )}
            </div>
          ))}

          {isLoading && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-card border border-border px-3 py-1.5 rounded-lg w-fit">
              <span className="flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" />
              </span>
              <span>Assistant is typing...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage(inputText);
          }}
          className="p-3 border-t border-border bg-card flex items-center gap-2"
        >
          <Input
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Reply or type e.g. bill Wifi 500 tomorrow..."
            disabled={isLoading}
            className="flex-1 h-9 text-xs"
          />
          <Button
            type="submit"
            size="sm"
            disabled={isLoading || !inputText.trim()}
            className="h-9 w-9 p-0"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
