'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@cairn/ui';

const EXPIRY_WARNING_MS = 30 * 24 * 60 * 60 * 1000;
const SECOND_MS = 1000;

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / SECOND_MS);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (days > 0 || hours > 0) parts.push(`${hours}h`);
  if (days > 0 || hours > 0 || minutes > 0) parts.push(`${minutes}m`);
  parts.push(`${seconds}s`);
  return parts.join(' ');
}

/**
 * Ticks every second -- a static "Renews in 1 day" computed once at page render only looks
 * accurate at the instant of that render. This recomputes against the client's own clock, so
 * seconds actually count down instead of just showing a value that's already stale on load.
 */
export function ExpiryCountdown({ expiresOn }: { expiresOn: string }) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), SECOND_MS);
    return () => clearInterval(id);
  }, []);

  // Render nothing on the server / before the first client tick to avoid a hydration mismatch
  // between server-render time and the browser's actual clock.
  if (now === null) {
    return <Badge variant="secondary">&nbsp;</Badge>;
  }

  const diff = new Date(expiresOn).getTime() - now;
  const isExpired = diff <= 0;
  const variant = isExpired
    ? 'destructive'
    : diff <= EXPIRY_WARNING_MS
      ? 'warning'
      : 'success';
  const label = isExpired
    ? `Expired ${formatDuration(-diff)} ago`
    : `Renews in ${formatDuration(diff)}`;

  return <Badge variant={variant}>{label}</Badge>;
}
