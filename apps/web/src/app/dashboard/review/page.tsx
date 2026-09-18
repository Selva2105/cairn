import { Badge } from '@cairn/ui';

import { apiFetch } from '../../../lib/api-client';
import { requireSession } from '../../../lib/session';
import { ReviewClient, ReviewEventData } from './review-client';

export default async function ReviewPage() {
  const session = await requireSession();
  const householdId = session.householdId;

  const events = await apiFetch<ReviewEventData[]>(
    `/households/${householdId}/events/review`,
  );

  return (
    <div className="flex flex-col gap-8 pb-10">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Needs Review
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Bills and events a connector wasn't fully confident about. Approve
            to notify your household normally, or dismiss false positives.
          </p>
        </div>
        <Badge
          variant="secondary"
          className="font-mono text-xs hidden sm:inline-flex"
        >
          {events.length} pending
        </Badge>
      </div>

      <ReviewClient events={events} householdId={householdId} />
    </div>
  );
}
