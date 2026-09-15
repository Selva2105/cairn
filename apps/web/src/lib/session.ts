import { redirect } from 'next/navigation';
import { cache } from 'react';

import { apiFetch, ApiError } from './api-client';

export interface Session {
  userId: string;
  householdId: string;
  role: string;
}

/**
 * Memoized per request (React's cache()) -- the dashboard layout and every page under it can
 * each call this without triggering a duplicate round trip to the API.
 */
export const getSession = cache(async (): Promise<Session | null> => {
  try {
    return await apiFetch<Session>('/auth/session');
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      return null;
    }
    throw error;
  }
});

/**
 * For pages under (protected) layouts that have already redirected on a missing session --
 * this just gives them a non-null Session without a `!` assertion. Redirects again as a
 * fallback if somehow called without that guarantee.
 */
export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }
  return session;
}
