import { NextResponse } from 'next/server';

const API_BASE_URL = process.env.API_BASE_URL ?? 'http://localhost:3000/api';
const WAKE_UP_DELAY_MS = 3000;

/**
 * Vercel Cron target (see vercel.json and ARCHITECTURE.md §18.3/§18.4). Render's free web
 * service spins down after 15 minutes idle -- ping /health first to wake it, then trigger the
 * actual pipeline run. `CRON_SECRET` is a server-only env var, never exposed to the client.
 */
export async function GET(request: Request): Promise<NextResponse> {
  const authHeader = request.headers.get('authorization');
  if (
    process.env.VERCEL_CRON_SECRET &&
    authHeader !== `Bearer ${process.env.VERCEL_CRON_SECRET}`
  ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await fetch(`${API_BASE_URL}/health`).catch(() => null);
  await new Promise((resolve) => setTimeout(resolve, WAKE_UP_DELAY_MS));

  const res = await fetch(`${API_BASE_URL}/internal/pipeline/run`, {
    method: 'POST',
    headers: {
      'x-cron-secret': process.env.CRON_SECRET ?? '',
      'content-type': 'application/json',
    },
    body: JSON.stringify({}),
  });

  const summary = await res.json().catch(() => null);
  return NextResponse.json(
    { ok: res.ok, summary },
    { status: res.ok ? 200 : 502 },
  );
}
