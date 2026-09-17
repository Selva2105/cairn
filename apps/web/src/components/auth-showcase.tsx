import {
  Sparkles,
  ShieldCheck,
  CalendarClock,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  Users,
} from 'lucide-react';

interface AuthShowcaseProps {
  mode?: 'login' | 'signup';
}

export function AuthShowcase({ mode = 'login' }: AuthShowcaseProps) {
  return (
    <aside className="relative hidden h-full w-full flex-col justify-between overflow-hidden border-r border-border bg-stone-50/80 dark:bg-card/30 p-8 lg:flex xl:p-14">
      {/* Brand Header */}
      <div className="relative z-10 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Sparkles className="h-5 w-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold tracking-tight text-foreground">
              Cairn
            </span>
            <span className="rounded-md border border-border bg-background px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Household OS
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Intelligent operations for modern homes
          </p>
        </div>
      </div>

      {/* Central Editorial Narrative & Showcase Bento */}
      <div className="relative z-10 my-auto flex flex-col gap-8 py-8">
        <div className="space-y-3">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl xl:text-[2.5rem] xl:leading-[1.15]">
            {mode === 'signup' ? (
              <>
                Notice what’s about to go wrong,{' '}
                <span className="text-primary">before it does.</span>
              </>
            ) : (
              <>
                Calm coordination for{' '}
                <span className="text-primary">your shared home.</span>
              </>
            )}
          </h2>
          <p className="max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">
            Never miss a warranty, let a bill slip by, or wonder whose turn it
            is. Cairn keeps your household synchronized in real-time.
          </p>
        </div>

        {/* Live Mockup Bento Cards - Crisp white cards in light mode, clean dark in dark mode */}
        <div className="flex flex-col gap-3">
          {/* Card 1: Document & Warranty Alert */}
          <div className="rounded-xl border border-border bg-white dark:bg-card/70 p-4 transition-colors">
            <div className="flex items-start gap-3.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-400">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-foreground truncate">
                    Home Insurance Policy
                  </p>
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-400">
                    <AlertCircle className="h-3 w-3" /> Expires in 12d
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Policy #HN-9241 · Renewal review suggested
                </p>
              </div>
            </div>
          </div>

          {/* Card 2: Household Task Card */}
          <div className="rounded-xl border border-border bg-white dark:bg-card/70 p-4 transition-colors">
            <div className="flex items-start gap-3.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <CalendarClock className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-foreground truncate">
                    HVAC Air Filter Replacement
                  </p>
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-success/20 bg-success/10 px-2 py-0.5 text-[11px] font-medium text-success">
                    <CheckCircle2 className="h-3 w-3" /> Scheduled
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Quarterly maintenance · Assigned to Household
                </p>
              </div>
            </div>
          </div>

          {/* Card 3: WhatsApp Copilot Sync */}
          <div className="rounded-xl border border-border bg-white dark:bg-card/70 p-4 transition-colors">
            <div className="flex items-start gap-3.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-success/10 text-success">
                <MessageSquare className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-foreground">
                    WhatsApp Assistant
                  </p>
                  <span className="text-[11px] text-muted-foreground">
                    Just now
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  &ldquo;Logged $124.50 plumbing repair receipt & updated
                  household budget.&rdquo;
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Trust Badge */}
      <div className="relative z-10 flex items-center justify-between border-t border-border pt-6 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="flex -space-x-1.5">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary/15 text-[9px] font-bold text-primary ring-1 ring-background">
              A
            </span>
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-success/15 text-[9px] font-bold text-success ring-1 ring-background">
              J
            </span>
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-500/15 text-[9px] font-bold text-amber-700 dark:text-amber-400 ring-1 ring-background">
              S
            </span>
          </div>
          <span>Trusted by modern shared homes</span>
        </div>
        <div className="flex items-center gap-1.5 font-medium text-muted-foreground">
          <Users className="h-3.5 w-3.5 text-primary" />
          <span>Private & Encrypted</span>
        </div>
      </div>
    </aside>
  );
}
