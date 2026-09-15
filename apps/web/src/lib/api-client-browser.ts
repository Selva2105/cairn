import { ApiError } from './api-error';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000/api';

/**
 * Client Component fetch wrapper -- relies on the browser sending the httpOnly session
 * cookie automatically (`credentials: 'include'`); it never reads or stores the token itself.
 */
export async function browserApiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers: { ...init?.headers, 'content-type': 'application/json' },
  });
  if (!res.ok) {
    throw await ApiError.fromResponse(res);
  }
  return res.json() as Promise<T>;
}
