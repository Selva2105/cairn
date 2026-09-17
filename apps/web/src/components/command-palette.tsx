'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import {
  CheckSquare,
  FileText,
  LayoutDashboard,
  Moon,
  Plus,
  Search,
  Sliders,
  Sun,
  UserPlus,
  Users,
} from 'lucide-react';

interface CommandItem {
  id: string;
  category: 'Navigation' | 'Actions' | 'Theme';
  title: string;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  perform: () => void;
  keywords?: string[];
}

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const inputRef = useRef<HTMLInputElement>(null);

  // Define commands
  const commands: CommandItem[] = [
    {
      id: 'nav-overview',
      category: 'Navigation',
      title: 'Go to Overview',
      subtitle: 'Household intelligence & activity',
      icon: LayoutDashboard,
      perform: () => router.push('/dashboard/overview'),
      keywords: ['home', 'dashboard', 'events', 'stats'],
    },
    {
      id: 'nav-documents',
      category: 'Navigation',
      title: 'Go to Documents',
      subtitle: 'Vital records & renewals',
      icon: FileText,
      perform: () => router.push('/dashboard/documents'),
      keywords: ['passport', 'insurance', 'lease', 'files'],
    },
    {
      id: 'nav-tasks',
      category: 'Navigation',
      title: 'Go to Tasks',
      subtitle: 'Chores & household to-dos',
      icon: CheckSquare,
      perform: () => router.push('/dashboard/tasks'),
      keywords: ['todos', 'chores', 'board'],
    },
    {
      id: 'nav-rules',
      category: 'Navigation',
      title: 'Go to Rules',
      subtitle: 'Automation thresholds & triggers',
      icon: Sliders,
      perform: () => router.push('/dashboard/rules'),
      keywords: ['automation', 'alerts', 'notifications'],
    },
    {
      id: 'nav-household',
      category: 'Navigation',
      title: 'Household Settings',
      subtitle: 'Manage members & WhatsApp bot',
      icon: Users,
      perform: () => router.push('/dashboard/settings/household'),
      keywords: ['members', 'invite', 'whatsapp', 'phone'],
    },
    {
      id: 'action-new-task',
      category: 'Actions',
      title: 'Create new task',
      subtitle: 'Add a to-do to the household board',
      icon: Plus,
      perform: () => router.push('/dashboard/tasks?action=new'),
      keywords: ['add task', 'new todo'],
    },
    {
      id: 'action-upload-doc',
      category: 'Actions',
      title: 'Upload vital document',
      subtitle: 'Track expiry date and receive alerts',
      icon: Plus,
      perform: () => router.push('/dashboard/documents?action=new'),
      keywords: ['add document', 'new record'],
    },
    {
      id: 'action-invite',
      category: 'Actions',
      title: 'Invite household member',
      subtitle: 'Generate an invite link or token',
      icon: UserPlus,
      perform: () => router.push('/dashboard/settings/household#invite'),
      keywords: ['share', 'join'],
    },
    {
      id: 'theme-toggle',
      category: 'Theme',
      title: theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode',
      subtitle: 'Toggle interface appearance',
      icon: theme === 'dark' ? Sun : Moon,
      perform: () => setTheme(theme === 'dark' ? 'light' : 'dark'),
      keywords: ['dark', 'light', 'appearance', 'mode'],
    },
  ];

  // Filter commands
  const filtered = commands.filter((cmd) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    const titleMatch = cmd.title.toLowerCase().includes(q);
    const subtitleMatch = cmd.subtitle?.toLowerCase().includes(q);
    const keywordMatch = cmd.keywords?.some((k) => k.toLowerCase().includes(q));
    return titleMatch || subtitleMatch || keywordMatch;
  });

  // Open / close keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      } else if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    const handleCustomOpen = () => setIsOpen(true);

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('open-command-palette', handleCustomOpen);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('open-command-palette', handleCustomOpen);
    };
  }, [isOpen]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Keyboard navigation within list
  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % (filtered.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(
        (prev) => (prev - 1 + filtered.length) % (filtered.length || 1),
      );
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const selected = filtered[selectedIndex];
      if (selected) {
        selected.perform();
        setIsOpen(false);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 p-4 bg-background/60 backdrop-blur-md animate-in fade-in-0 duration-150"
      onClick={() => setIsOpen(false)}
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-xl border border-border bg-card/95 backdrop-blur-xl animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 border-b border-border px-4 py-3.5">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleInputKeyDown}
            placeholder="Type a command or search..."
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          <kbd className="hidden sm:inline-flex items-center gap-1 rounded bg-secondary/80 px-2 py-0.5 text-[10px] font-medium text-muted-foreground border border-border">
            ESC
          </kbd>
        </div>

        {/* Command List */}
        <div className="max-h-80 overflow-y-auto p-2 scrollbar-none">
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              No matching commands or pages found.
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {filtered.map((item, index) => {
                const Icon = item.icon;
                const isSelected = index === selectedIndex;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      item.perform();
                      setIsOpen(false);
                    }}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={`flex w-full items-center justify-between rounded-lg px-3.5 py-2.5 text-left text-sm transition-colors duration-150 ${
                      isSelected
                        ? 'bg-primary/10 text-primary border border-primary/20'
                        : 'text-foreground hover:bg-accent/60'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-7 w-7 items-center justify-center rounded-lg ${
                          isSelected
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-secondary text-secondary-foreground'
                        }`}
                      >
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <div className="font-medium">{item.title}</div>
                        {item.subtitle && (
                          <div className="text-[11px] text-muted-foreground">
                            {item.subtitle}
                          </div>
                        )}
                      </div>
                    </div>
                    <span className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground/70">
                      {item.category}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="flex items-center justify-between border-t border-border/50 bg-secondary/30 px-4 py-2 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-2">
            <span>
              Navigate: <kbd className="font-mono">↑</kbd>{' '}
              <kbd className="font-mono">↓</kbd>
            </span>
            <span>•</span>
            <span>
              Select: <kbd className="font-mono">↵</kbd>
            </span>
          </div>
          <span>
            Press <kbd className="font-mono">⌘K</kbd> anytime
          </span>
        </div>
      </div>
    </div>
  );
}
