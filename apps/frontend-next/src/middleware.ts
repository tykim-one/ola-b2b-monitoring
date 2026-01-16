import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Define public routes that don't require authentication
const PUBLIC_ROUTES = ['/login'];

// Define routes that should be ignored by middleware
const IGNORED_ROUTES = [
  '/api',
  '/_next',
  '/favicon.ico',
  '/robots.txt',
  '/sitemap.xml',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Redirect root '/' to '/ibks/logs' (Default Project)
  if (pathname === '/') {
    return NextResponse.redirect(new URL('/ibks/logs', request.url));
  }

  // Ignore certain routes
  if (IGNORED_ROUTES.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Check if the route is public
  const isPublicRoute = PUBLIC_ROUTES.some(route => pathname.startsWith(route));

  // Get the refresh token from cookies
  // Note: The actual authentication check happens on the client side via AuthContext
  // This middleware primarily handles redirects based on cookie presence
  const hasRefreshToken = request.cookies.has('refreshToken');

  // If accessing a protected route without a refresh token, redirect to login
  if (!isPublicRoute && !hasRefreshToken) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // If accessing login page while authenticated, redirect to dashboard
  if (isPublicRoute && hasRefreshToken && pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

// Configure which routes use this middleware
export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*|public).*)',
  ],
};
