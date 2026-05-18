import { hasNeonAuthSessionCookie } from "#lib/auth/neon-session-cookie.shared"
import { isMarkdownPreferred, rewritePath } from "fumadocs-core/negotiation"
import createIntlMiddleware from "next-intl/middleware"
import { type NextRequest, NextResponse } from "next/server"

import {
  AFENDA_PATHNAME_HEADER,
  AFENDA_SEARCH_HEADER,
} from "#lib/auth/forwarded-path-headers.shared"
import {
  isProtectedLocaleInternalPath,
  localeInternalSignInPathForProtectedRoute,
} from "#lib/auth/proxy-protected-paths.shared"
import { AFENDA_LOCALE_HEADER } from "#lib/i18n/locale-header.shared"
import {
  stripLeadingLocalePrefix,
  toLocalePath,
} from "#lib/i18n/locales.shared"

import { routing } from "./i18n/routing"

const intlMiddleware = createIntlMiddleware(routing)

/**
 * Rewrite `/{locale}/ask-docs/…` → `/llms.mdx/ask-docs/…` for AI clients that
 * prefer Markdown over HTML (Accept: text/markdown / text/plain / text/x-markdown).
 * The `/llms.mdx` route handler serves the processed MDX as plain text.
 */
const { rewrite: rewriteAskDocsMarkdown } = rewritePath(
  "/:locale/ask-docs{/*path}",
  "/llms.mdx/ask-docs/:locale{/*path}"
)

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
 * Neon Auth `getSession` / `requireOrgSession` / `requireGlobalAdminSession`.
 *
 * For authenticated hits, forwards full pathname + query to Server Components via
 * request headers so guards can preserve `callbackUrl` on interruption redirects.
 *
 * Tenant URLs under `/o/{slug}/…` and canonical auth/account surfaces
 * (`/sign-in`, `/account/*`, `/accept-invitation`, `/console`, `/platform/*`, legacy `/operator/*`).
 * Legacy `/{locale}/onboarding` redirects to `/console` via `next.config.ts`.
 * require a cookie gate (see Next.js Data Security — proxy checks are optimistic only).
 */
export function proxy(request: NextRequest) {
  // AI agents that prefer Markdown get the raw MDX content directly — no locale
  // processing or auth check needed for the markdown endpoint.
  if (isMarkdownPreferred(request)) {
    const rewritten = rewriteAskDocsMarkdown(request.nextUrl.pathname)
    if (rewritten) {
      return NextResponse.rewrite(new URL(rewritten, request.nextUrl))
    }
  }

  const intlResponse = intlMiddleware(request)

  if (intlResponse.redirected) {
    return intlResponse
  }

  const pathname = request.nextUrl.pathname
  const stripped = stripLeadingLocalePrefix(pathname)
  const token = hasNeonAuthSessionCookie(request)

  const protectedHit =
    stripped &&
    isProtectedLocaleInternalPath(stripped.pathnameWithoutLocale) &&
    token

  const protectedRedirect =
    stripped &&
    isProtectedLocaleInternalPath(stripped.pathnameWithoutLocale) &&
    !token

  if (protectedRedirect) {
    const signInPath = localeInternalSignInPathForProtectedRoute()
    const signIn = new URL(
      toLocalePath(stripped.locale, signInPath),
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
  // Exclude api routes, Next.js internals, Vercel internals, static files, and
  // the Sentry tunnel route (/monitoring) which must not be intercepted by intl middleware.
  matcher: ["/((?!api|monitoring|og|_next|_vercel|\\.well-known|.*\\..*).*)"],
}
