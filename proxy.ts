import { getSessionCookie } from "better-auth/cookies"
import { NextRequest, NextResponse } from "next/server"

/**
 * Presence-only session cookie check (Better Auth + Next.js guidance).
 * Does not validate the session — RSC, layouts, and Server Actions must call
 * `auth.api.getSession` / `requireOrgSession` / `requireGlobalAdminSession`.
 */
export function proxy(request: NextRequest) {
  const token = getSessionCookie(request)
  if (!token) {
    const signIn = new URL("/sign-in", request.url)
    const returnTo =
      request.nextUrl.pathname +
      (request.nextUrl.searchParams.toString()
        ? `?${request.nextUrl.searchParams.toString()}`
        : "")
    signIn.searchParams.set("callbackUrl", returnTo)
    return NextResponse.redirect(signIn)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/onboarding",
    "/onboarding/:path*",
    "/account/:path*",
    "/admin/:path*",
  ],
}
