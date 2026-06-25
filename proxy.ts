import { getSessionCookie } from "better-auth/cookies";
import { NextRequest, NextResponse } from "next/server";
import { sanitizeCallbackUrl } from "./lib/redirects";

const PROTECTED_PATTERN =
  /^\/(dashboard|onboarding)$|^\/invite\/|^\/[^/]+\/(dashboard|caregiver|family|alert|settings|consent|patients)(\/|$)/;

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = getSessionCookie(request);
  const isProtected = PROTECTED_PATTERN.test(pathname);

  if (isProtected && !sessionCookie) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", sanitizeCallbackUrl(pathname));
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard",
    "/onboarding",
    "/login",
    "/signup",
    "/:orgId/dashboard",
    "/:orgId/caregiver/:path*",
    "/:orgId/family/:path*",
    "/:orgId/alert/:path*",
    "/:orgId/settings/:path*",
    "/:orgId/patients/:path*",
    "/:orgId/consent",
    "/invite/:path*",
  ],
};
