import { Badge } from '@cairn/ui';

import { apiFetch } from '../../../lib/api-client';
import { requireSession } from '../../../lib/session';
import { DocumentsClient, DocumentRow } from './documents-client';
import { DocumentForm } from './document-form';

interface HouseholdConfig {
  documentTypes: string[];
}

export default async function DocumentsPage() {
  const session = await requireSession();
  const householdId = session.householdId;

  const [documents, config] = await Promise.all([
    apiFetch<DocumentRow[]>(`/households/${householdId}/documents`),
    apiFetch<HouseholdConfig>(`/households/${householdId}/config`),
  ]);

  return (
    <div className="flex flex-col gap-8 pb-10">
      {/* Header section */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Documents Vault
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Vital household records, expiration notices, renewal pipelines, and
            automated alerts.
          </p>
        </div>
        <Badge
          variant="secondary"
          className="font-mono text-xs hidden sm:inline-flex"
        >
          {documents.length} {documents.length === 1 ? 'record' : 'records'}
        </Badge>
      </div>

      {/* Add Document Section */}
      <DocumentForm
        householdId={householdId}
        documentTypes={config.documentTypes}
      />

      {/* Interactive Filter Suite & Document Grid */}
      <DocumentsClient documents={documents} householdId={householdId} />
    </div>
  );
}
