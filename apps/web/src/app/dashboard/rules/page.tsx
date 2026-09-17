import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@cairn/ui';
import { Sliders, Zap } from 'lucide-react';

import { apiFetch } from '../../../lib/api-client';
import { requireSession } from '../../../lib/session';
import { RuleForm } from './rule-form';
import { RuleRow } from './rule-row';

interface RuleRowData {
  id: string;
  name: string;
  isActive: boolean;
}

export default async function RulesPage() {
  const session = await requireSession();
  const householdId = session.householdId;

  const rules = await apiFetch<RuleRowData[]>(
    `/households/${householdId}/rules`,
  );

  return (
    <div className="flex flex-col gap-8 pb-10">
      {/* Header section */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Automations & Rules
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Customize alert thresholds, expiration early warnings, and automated
            pipelines.
          </p>
        </div>
        <Badge
          variant="secondary"
          className="font-mono text-xs hidden sm:inline-flex"
        >
          {rules.length} {rules.length === 1 ? 'rule' : 'rules'} active
        </Badge>
      </div>

      {/* Rule Builder Card */}
      <Card className="flex flex-col">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Zap className="h-4 w-4" />
              </div>
              <CardTitle className="text-base font-semibold">
                Rule Pipeline Engine
              </CardTitle>
            </div>
            <span className="text-xs text-muted-foreground">
              Automated daily runner
            </span>
          </div>
          <CardDescription className="text-xs">
            Override the default 30-day warning window with bespoke thresholds
            per household stream.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <RuleForm householdId={householdId} />

          <div className="pt-2 border-t border-border/40">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Configured Custom Rules ({rules.length})
              </h3>
              <span className="text-[11px] text-muted-foreground">
                Default fallback is 30 days
              </span>
            </div>

            {rules.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center rounded-xl bg-secondary/20 border border-dashed border-border/40">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted border border-border text-muted-foreground mb-2">
                  <Sliders className="h-5 w-5 opacity-60" />
                </div>
                <p className="text-xs font-semibold text-foreground">
                  Using default thresholds
                </p>
                <p className="text-[11px] text-muted-foreground max-w-sm mt-0.5">
                  No custom notification rules configured yet. All upcoming
                  renewals and bills notify on the standard 30-day window.
                </p>
              </div>
            ) : (
              <ul className="flex flex-col gap-2.5">
                {rules.map((rule) => (
                  <RuleRow
                    key={rule.id}
                    householdId={householdId}
                    ruleId={rule.id}
                    name={rule.name}
                    isActive={rule.isActive}
                  />
                ))}
              </ul>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
