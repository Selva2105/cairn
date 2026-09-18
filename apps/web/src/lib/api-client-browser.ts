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
  // A FormData body (file uploads) needs the browser to set its own multipart
  // Content-Type with the correct boundary -- forcing 'application/json' here would
  // corrupt the request so the server can't parse it as multipart at all.
  const isFormData = init?.body instanceof FormData;
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      ...init?.headers,
      ...(isFormData ? {} : { 'content-type': 'application/json' }),
    },
  });
  if (!res.ok) {
    throw await ApiError.fromResponse(res);
  }
  return res.json() as Promise<T>;
}
