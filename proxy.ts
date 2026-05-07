import { getSessionCookie } from "better-auth/cookies"
import createIntlMiddleware from "next-intl/middleware"
import { NextRequest, NextResponse } from "next/server"

import {
  AFENDA_PATHNAME_HEADER,
  AFENDA_SEARCH_HEADER,
} from "#lib/auth/forwarded-path-headers.shared"
import { AFENDA_LOCALE_HEADER } from "#lib/i18n/locale-header.shared"
import {
  stripLeadingLocalePrefix,
  toLocalePath,
} from "#lib/i18n/locales.shared"

import { routing } from "./i18n/routing"

const intlMiddleware = createIntlMiddleware(routing)

const PROTECTED_PATH_PREFIXES = [
  "/dashboard",
  "/onboarding",
  "/account",
  "/admin",
  "/accept-invitation",
] as const

/** Any locale-internal path under `/o/{slug}/…` (tenant surface). */
function isOrgScopedPathname(pathnameWithoutLocale: string): boolean {
  if (/^\/o\/[^/]+\//.test(pathnameWithoutLocale)) {
    return true
  }
  return /^\/o\/[^/]+$/.test(pathnameWithoutLocale)
}

function isProtectedPathname(pathnameWithoutLocale: string): boolean {
  if (isOrgScopedPathname(pathnameWithoutLocale)) {
    return true
  }
  return PROTECTED_PATH_PREFIXES.some(
    (prefix) =>
      pathnameWithoutLocale === prefix ||
      pathnameWithoutLocale.startsWith(`${prefix}/`)
  )
}

function copySetCookieHeaders(from: NextResponse, to: NextResponse) {
  const getSetCookie = (
    from.headers as unknown as { getSetCookie?: () => string[] }
  ).getSetCookie?.()
  if (getSetCookie?.length) {
    for (const v of getSetCookie) {
      to.headers.append("set-cookie", v)
    }
  } else {
    const single = from.headers.get("set-cookie")
    if (single) to.headers.append("set-cookie", single)
  }
}

/**
 * Locale routing (next-intl) + presence-only session cookie check (Better Auth).
 * Does not validate the session — RSC, layouts, and Server Actions must call
 * `auth.api.getSession` / `requireOrgSession` / `requireGlobalAdminSession`.
 *
 * For authenticated hits, forwards full pathname + query to Server Components via
 * request headers so guards can preserve `callbackUrl` on interruption redirects.
 *
 * Tenant URLs under `/o/{slug}/…` require the same cookie gate as `/dashboard` (see
 * Next.js Data Security — proxy checks are optimistic only).
 */
export function proxy(request: NextRequest) {
  const intlResponse = intlMiddleware(request)

  if (intlResponse.redirected) {
    return intlResponse
  }

  const pathname = request.nextUrl.pathname
  const stripped = stripLeadingLocalePrefix(pathname)
  const token = getSessionCookie(request)

  const protectedHit =
    stripped && isProtectedPathname(stripped.pathnameWithoutLocale) && token

  const protectedRedirect =
    stripped && isProtectedPathname(stripped.pathnameWithoutLocale) && !token

  if (protectedRedirect) {
    const signIn = new URL(
      toLocalePath(stripped.locale, "/sign-in"),
      request.url
    )
    const returnTo =
      pathname +
      (request.nextUrl.searchParams.toString()
        ? `?${request.nextUrl.searchParams.toString()}`
        : "")
    signIn.searchParams.set("callbackUrl", returnTo)
    const out = NextResponse.redirect(signIn)
    copySetCookieHeaders(intlResponse, out)
    return out
  }

  const requestHeaders = new Headers(request.headers)
  if (stripped) {
    requestHeaders.set(AFENDA_LOCALE_HEADER, stripped.locale)
  }
  if (protectedHit) {
    requestHeaders.set(AFENDA_PATHNAME_HEADER, pathname)
    requestHeaders.set(
      AFENDA_SEARCH_HEADER,
      request.nextUrl.searchParams.toString()
    )
  }

  const out = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })
  copySetCookieHeaders(intlResponse, out)
  return out
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
}
