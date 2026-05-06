import { NextRequest, NextResponse } from "next/server"

import { auth } from "#lib/auth"

export async function proxy(request: NextRequest) {
  // Prefer the incoming request headers (Next.js proxy convention) so the session
  // cookie is always the one from this request.
  const session = await auth.api.getSession({
    headers: request.headers,
  })

  if (!session) {
    return NextResponse.redirect(new URL("/sign-in", request.url))
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
