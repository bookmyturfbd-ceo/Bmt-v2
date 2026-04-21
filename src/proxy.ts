import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { NextRequest, NextResponse } from 'next/server';

const handleI18nRouting = createMiddleware(routing);

// Routes that require authentication (exact or prefix match)
const PROTECTED_PREFIXES = [
  '/en/booking',
  '/bn/booking',
  '/en/team',
  '/bn/team',
  '/en/dashboard',
  '/bn/dashboard',
];

// Routes requiring admin role
const ADMIN_PREFIXES = ['/en/admin', '/bn/admin'];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // --- Admin guard ---
  if (ADMIN_PREFIXES.some(p => pathname.startsWith(p))) {
    const role = request.cookies.get('bmt_role');
    if (role?.value !== 'admin') {
      const loginUrl = new URL('/en/login', request.url);
      loginUrl.searchParams.set('next', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // --- General auth guard ---
  const isProtected = PROTECTED_PREFIXES.some(prefix => pathname.startsWith(prefix));
  if (isProtected) {
    const authCookie = request.cookies.get('bmt_auth');
    if (!authCookie?.value) {
      const loginUrl = new URL('/en/login', request.url);
      loginUrl.searchParams.set('next', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return handleI18nRouting(request);
}

export const config = {
  matcher: ['/', '/(bn|en)/:path*']
};
