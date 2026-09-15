import { COOKIES } from '@cairn/shared-constants';
import { NextRequest, NextResponse } from 'next/server';

const PROTECTED_PREFIX = '/dashboard';

/**
 * Cheap presence check only -- it can't decode an httpOnly cookie's contents. This is a UX
 * optimization, not the real security boundary: every API endpoint still enforces its own
 * JwtAuthGuard/HouseholdRoleGuard regardless of what this middleware thinks.
 * See CAIRN_FRONTEND_ENGINEERING.md §4.
 */
export function proxy(request: NextRequest) {
  const hasSession = request.cookies.has(COOKIES.ACCESS_TOKEN);

  if (!hasSession && request.nextUrl.pathname.startsWith(PROTECTED_PREFIX)) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*'],
};
