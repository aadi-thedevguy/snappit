import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Check if this is a share path
  if (pathname.startsWith("/share/")) {
    return NextResponse.next();
  }

  const sessionCookie = getSessionCookie(request);  
  // For other routes, check for session
  try {
    if (!sessionCookie) {
      return NextResponse.redirect(new URL("/sign-in", request.url));
    }
  } catch (error) {
    console.error("Error checking session:", error);
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|sign-in|assets).*)"],
};