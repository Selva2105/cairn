import { cookies } from 'next/headers';

import { ApiError } from './api-error';

export { ApiError };

const API_BASE_URL = process.env.API_BASE_URL ?? 'http://localhost:3000/api';

/**
 * Server Component / Server Action fetch wrapper -- forwards the incoming request's session
 * cookie so the API sees the same authenticated user. Never used from client components (the
 * access token is httpOnly and never reaches the browser bundle by design).
 * See CAIRN_FRONTEND_ENGINEERING.md §3.
 */
export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const cookieStore = await cookies();
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      ...init?.headers,
      cookie: cookieStore.toString(),
      'content-type': 'application/json',
    },
    cache: 'no-store', // household data is per-user; don't let Next cache it across users
  });
  if (!res.ok) {
    throw await ApiError.fromResponse(res);
  }
  return res.json() as Promise<T>;
}
