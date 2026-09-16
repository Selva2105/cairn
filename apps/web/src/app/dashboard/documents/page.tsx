import { Card, CardContent, CardHeader, CardTitle } from '@cairn/ui';

import { apiFetch } from '../../../lib/api-client';
import { requireSession } from '../../../lib/session';
import { DocumentForm } from './document-form';
import { ExpiryCountdown } from './expiry-countdown';

interface DocumentRow {
  id: string;
  type: string;
  label: string;
  expiresOn: string;
  notes: string | null;
}

export default async function DocumentsPage() {
  const session = await requireSession();
  const householdId = session.householdId;

  const documents = await apiFetch<DocumentRow[]>(
    `/households/${householdId}/documents`,
  );

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Documents</h1>

      <DocumentForm householdId={householdId} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {documents.map((document) => (
          <Card key={document.id}>
            <CardHeader>
              <CardTitle className="text-base">{document.label}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <p className="text-xs uppercase text-muted-foreground">
                {document.type}
              </p>
              <ExpiryCountdown expiresOn={document.expiresOn} />
              <p className="text-xs text-muted-foreground">
                {formatExpiryDateTime(document.expiresOn)}
              </p>
              {document.notes && (
                <p className="text-sm text-muted-foreground">
                  {document.notes}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
        {documents.length === 0 && (
          <p className="text-sm text-muted-foreground">No documents yet.</p>
        )}
      </div>
    </div>
  );
}

function formatExpiryDateTime(dateIso: string): string {
  return new Date(dateIso).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}
