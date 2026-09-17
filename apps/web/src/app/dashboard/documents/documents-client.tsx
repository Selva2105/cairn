'use client';

import { useState, useMemo } from 'react';
import {
  Button,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@cairn/ui';
import {
  Calendar,
  Car,
  CheckCircle2,
  Eye,
  FileCheck,
  Files,
  FileText,
  Heart,
  Home,
  Search,
  Shield,
  X,
} from 'lucide-react';

import { DocumentDeleteButton } from './document-delete-button';
import { ExpiryCountdown } from './expiry-countdown';

export interface DocumentRow {
  id: string;
  type: string;
  label: string;
  expiresOn: string;
  notes: string | null;
}

const CATEGORIES = [
  { id: 'ALL', label: 'All Records' },
  { id: 'IDENTITY', label: 'Passports & ID' },
  { id: 'INSURANCE', label: 'Insurance' },
  { id: 'HOME', label: 'Home & Lease' },
  { id: 'HEALTH', label: 'Health & Medical' },
  { id: 'VEHICLE', label: 'Vehicles' },
];

export function DocumentsClient({
  documents,
  householdId,
}: {
  documents: DocumentRow[];
  householdId: string;
}) {
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'nearest' | 'furthest' | 'az'>(
    'nearest',
  );
  const [inspectDoc, setInspectDoc] = useState<DocumentRow | null>(null);

  // Filter & Sort
  const filteredDocuments = useMemo(() => {
    return documents
      .filter((doc) => {
        // Category filter
        if (selectedCategory !== 'ALL') {
          const typeUpper = doc.type.toUpperCase();
          const matches =
            (selectedCategory === 'IDENTITY' &&
              (typeUpper.includes('PASSPORT') ||
                typeUpper.includes('ID') ||
                typeUpper.includes('LICENSE'))) ||
            (selectedCategory === 'INSURANCE' && typeUpper.includes('INSUR')) ||
            (selectedCategory === 'HOME' &&
              (typeUpper.includes('HOME') ||
                typeUpper.includes('LEASE') ||
                typeUpper.includes('RENT'))) ||
            (selectedCategory === 'HEALTH' &&
              (typeUpper.includes('HEALTH') || typeUpper.includes('MED'))) ||
            (selectedCategory === 'VEHICLE' &&
              (typeUpper.includes('CAR') || typeUpper.includes('VEHICLE')));
          if (!matches) return false;
        }

        // Search query filter
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchLabel = doc.label.toLowerCase().includes(q);
          const matchType = doc.type.toLowerCase().includes(q);
          const matchNotes = doc.notes?.toLowerCase().includes(q);
          if (!matchLabel && !matchType && !matchNotes) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'nearest') {
          return (
            new Date(a.expiresOn).getTime() - new Date(b.expiresOn).getTime()
          );
        }
        if (sortBy === 'furthest') {
          return (
            new Date(b.expiresOn).getTime() - new Date(a.expiresOn).getTime()
          );
        }
        return a.label.localeCompare(b.label);
      });
  }, [documents, selectedCategory, searchQuery, sortBy]);

  // Quota stats (assuming typical household quota of 50)
  const quotaLimit = 50;
  const quotaPercentage = Math.min(
    Math.round((documents.length / quotaLimit) * 100),
    100,
  );

  return (
    <div className="flex flex-col gap-6">
      {/* 1. Control & Filter Suite */}
      <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4">
        {/* Top: Vault Quota & Search Bar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Quota indicator */}
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold">
              <FileCheck className="h-4 w-4" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-foreground">
                  Vault Storage
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {documents.length} of {quotaLimit} records ({quotaPercentage}
                  %)
                </span>
              </div>
              <div className="mt-1 h-1.5 w-36 rounded-full bg-secondary/80 overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-300"
                  style={{ width: `${quotaPercentage}%` }}
                />
              </div>
            </div>
          </div>

          {/* Search input & Sort selector */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter by label or note..."
                className="w-full rounded-lg border border-border bg-background pl-8 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground/40 focus:ring-1 focus:ring-foreground/20"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <select
              value={sortBy}
              onChange={(e) =>
                setSortBy(e.target.value as 'nearest' | 'furthest' | 'az')
              }
              className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-foreground/40 focus:ring-1 focus:ring-foreground/20"
            >
              <option value="nearest">Nearest Expiry</option>
              <option value="furthest">Furthest Expiry</option>
              <option value="az">Title A-Z</option>
            </select>
          </div>
        </div>

        {/* Bottom: Category Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none border-t border-border pt-3">
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors duration-150 ${
                  isSelected
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary/40 text-muted-foreground hover:bg-secondary hover:text-foreground'
                }`}
              >
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Document Cards Grid */}
      {filteredDocuments.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-14 px-4 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted border border-border text-muted-foreground mb-3">
            <Files className="h-6 w-6 opacity-60" />
          </div>
          <p className="text-sm font-semibold text-foreground">
            {searchQuery || selectedCategory !== 'ALL'
              ? 'No matching documents'
              : 'No documents in vault yet'}
          </p>
          <p className="text-xs text-muted-foreground max-w-sm mt-1">
            {searchQuery || selectedCategory !== 'ALL'
              ? 'Try adjusting your search query or switching the category tab above.'
              : 'Add passports, insurance, or vehicle registration records above to begin receiving automated alerts.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredDocuments.map((doc) => {
            const now = new Date();
            const expiry = new Date(doc.expiresOn);
            const diffDays = Math.ceil(
              (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
            );
            const isExpired = diffDays < 0;
            const isUrgent = diffDays <= 15 && !isExpired;

            return (
              <Card
                key={doc.id}
                variant="interactive"
                className="flex flex-col justify-between group"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-secondary/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {getCategoryIcon(doc.type)}
                      <span>{doc.type}</span>
                    </span>
                    <ExpiryCountdown expiresOn={doc.expiresOn} />
                  </div>
                  <CardTitle className="text-base font-semibold leading-snug group-hover:text-primary transition-colors">
                    {doc.label}
                  </CardTitle>
                </CardHeader>

                <CardContent className="flex flex-col gap-3 pb-4">
                  {/* Date format */}
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5 shrink-0 text-muted-foreground/80" />
                    <span>Expires {formatExpiryDateTime(doc.expiresOn)}</span>
                  </div>

                  {/* Visual Validity Bar */}
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                      <span>Status</span>
                      <span
                        className={`font-semibold ${
                          isExpired
                            ? 'text-destructive'
                            : isUrgent
                              ? 'text-amber-500'
                              : 'text-success'
                        }`}
                      >
                        {isExpired
                          ? 'Action required'
                          : isUrgent
                            ? 'Expiring soon'
                            : 'Protected'}
                      </span>
                    </div>
                    <div className="h-1 w-full rounded-full bg-secondary/80 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          isExpired
                            ? 'bg-destructive w-full'
                            : isUrgent
                              ? 'bg-amber-500 w-1/4'
                              : 'bg-emerald-500 w-3/4'
                        }`}
                      />
                    </div>
                  </div>

                  {doc.notes && (
                    <div className="rounded-lg bg-accent/40 border border-accent/60 p-2 text-xs text-muted-foreground line-clamp-2">
                      {doc.notes}
                    </div>
                  )}
                </CardContent>

                <CardFooter className="pt-2 border-t border-border/40 flex items-center justify-between">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 gap-1 text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => setInspectDoc(doc)}
                  >
                    <Eye className="h-3.5 w-3.5" />
                    <span>Inspect</span>
                  </Button>
                  <DocumentDeleteButton
                    householdId={householdId}
                    documentId={doc.id}
                    label={doc.label}
                  />
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      {/* 3. Document Inspection Slide-Over / Modal */}
      {inspectDoc && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/60 backdrop-blur-md animate-in fade-in-0 duration-150"
          onClick={() => setInspectDoc(null)}
        >
          <div
            className="w-full max-w-lg rounded-xl border border-border bg-card/95 backdrop-blur-xl p-6 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between pb-4 border-b border-border/50">
              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Record Details
                </span>
                <h3 className="text-xl font-bold text-foreground">
                  {inspectDoc.label}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setInspectDoc(null)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="py-5 flex flex-col gap-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1 rounded-xl p-3 bg-secondary/30 border border-border/40">
                  <span className="text-muted-foreground font-medium">
                    Category Type
                  </span>
                  <span className="text-sm font-semibold uppercase">
                    {inspectDoc.type}
                  </span>
                </div>
                <div className="flex flex-col gap-1 rounded-xl p-3 bg-secondary/30 border border-border/40">
                  <span className="text-muted-foreground font-medium">
                    Expiration Status
                  </span>
                  <ExpiryCountdown expiresOn={inspectDoc.expiresOn} />
                </div>
              </div>

              <div className="flex flex-col gap-1.5 rounded-xl p-3 bg-secondary/30 border border-border/40">
                <span className="text-muted-foreground font-medium">
                  Expiration Timestamp
                </span>
                <span className="text-sm font-mono text-foreground">
                  {new Date(inspectDoc.expiresOn).toUTCString()}
                </span>
              </div>

              {inspectDoc.notes ? (
                <div className="flex flex-col gap-1.5 rounded-xl p-3 bg-secondary/30 border border-border/40">
                  <span className="text-muted-foreground font-medium">
                    Internal Notes
                  </span>
                  <p className="text-xs text-foreground whitespace-pre-wrap">
                    {inspectDoc.notes}
                  </p>
                </div>
              ) : (
                <div className="rounded-xl p-3 bg-secondary/20 border border-dashed border-border/40 text-muted-foreground italic">
                  No notes recorded for this document.
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-border/50 flex justify-between items-center">
              <DocumentDeleteButton
                householdId={householdId}
                documentId={inspectDoc.id}
                label={inspectDoc.label}
              />
              <Button size="sm" onClick={() => setInspectDoc(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function getCategoryIcon(type: string) {
  const t = type.toUpperCase();
  if (t.includes('PASSPORT') || t.includes('ID') || t.includes('LICENSE')) {
    return <Shield className="h-3 w-3" />;
  }
  if (t.includes('INSUR')) {
    return <CheckCircle2 className="h-3 w-3" />;
  }
  if (t.includes('HOME') || t.includes('LEASE') || t.includes('RENT')) {
    return <Home className="h-3 w-3" />;
  }
  if (t.includes('HEALTH') || t.includes('MED')) {
    return <Heart className="h-3 w-3" />;
  }
  if (t.includes('CAR') || t.includes('VEHICLE')) {
    return <Car className="h-3 w-3" />;
  }
  return <FileText className="h-3 w-3" />;
}

function formatExpiryDateTime(dateIso: string): string {
  return new Date(dateIso).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}
