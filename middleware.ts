import { type NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  // Handle late pass parameter for FTC Residency application
  if (request.nextUrl.pathname === '/events/funding-commons-residency-2025/apply') {
    const latePass = request.nextUrl.searchParams.get('latePass');
    
    if (latePass) {
      // Create response and set cookie
      const response = NextResponse.redirect(
        new URL('/events/funding-commons-residency-2025/apply', request.url)
      );
      
      response.cookies.set('ftc-late-pass', latePass, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 24 * 60 * 60, // 24 hours
        path: '/',
      });
      
      return response;
    }
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: '/events/funding-commons-residency-2025/apply',
};