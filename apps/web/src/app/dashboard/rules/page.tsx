import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@cairn/ui';

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
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Rules</h1>

      <Card>
        <CardHeader>
          <CardTitle>Custom notification rules</CardTitle>
          <CardDescription>
            Override the default 30-day warning with your own threshold, per
            event type. Owner-only.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <RuleForm householdId={householdId} />
          {rules.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No custom rules yet -- household events use the default
              thresholds.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
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
        </CardContent>
      </Card>
    </div>
  );
}
