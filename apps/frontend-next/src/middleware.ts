import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Redirect root '/' to '/ibks/logs' (Default Project)
  if (pathname === '/') {
    return NextResponse.redirect(new URL('/ibks/logs', request.url));
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: '/',
};
