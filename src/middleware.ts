import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// This function can be marked `async` if using `await` inside
export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const isPublicPath = path === '/auth' || path.startsWith('/api/auth');
  const token = request.cookies.get('sessionId')?.value || '';

  // If it's an API auth route, allow it
  if (path.startsWith('/api/auth/')) {
    return NextResponse.next();
  }

  // If user is not logged in and trying to access a protected route
  if (!isPublicPath && !token) {
    return NextResponse.redirect(new URL('/auth', request.url));
  }

  // If user is logged in and trying to access auth pages
  if (isPublicPath && token) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
