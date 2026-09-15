'use client';

import { useEffect } from 'react';

export function RegisterServiceWorker() {
  useEffect(() => {
    if (
      process.env.NODE_ENV !== 'production' ||
      !('serviceWorker' in navigator)
    ) {
      return;
    }
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Best-effort -- a failed registration just means no offline shell, not a broken app.
    });
  }, []);

  return null;
}
