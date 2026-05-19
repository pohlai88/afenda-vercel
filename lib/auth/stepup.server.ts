import "server-only"

import type { Route } from "next"
import { redirect } from "next/navigation"

import { getRequestAppLocale } from "#lib/i18n/request-locale.server"

import { AUTH_STATUS } from "./auth-status.shared"
import { redirectToAuthInterruption } from "./interruption-redirect.server"
import { resolveSessionReverifyHref } from "./session-reverify-path.server"
import { getAuthSessionTrusted } from "#lib/session-cache"

import { isSessionFresh } from "./session-policy.server"

/**
 * Ensures the user has a **fresh** session (see Better Auth `freshAge`) using a
 * DB-backed `getSession` (`disableCookieCache`) so cookie cache cannot bypass step-up.
 * Use on sensitive routes (admin, security settings).
 *
 * Unauthenticated or stale sessions redirect via the shared interruption surface
 * (`/session-expired?authStatus=…`) so copy and return paths stay consistent with
 * tenant guards (Next.js `redirect` in Server Components).
 */
export async function requireRecentAuthStepUp(options: {
  /** Locale-prefixed path (+ optional query) to resume after reverify. */
  returnTo: string
  /** Override reverify surface when the default resolver is insufficient. */
  reverifyPath?: string
}): Promise<void> {
  const record = await getAuthSessionTrusted()
  if (!record?.session) {
    await redirectToAuthInterruption(AUTH_STATUS.SESSION_EXPIRED, {
      callbackPath: options.returnTo,
    })
  }
  const sessionBody = record!.session
  if (!isSessionFresh(sessionBody)) {
    const locale = await getRequestAppLocale()
    const reverifyHref =
      options.reverifyPath ??
      resolveSessionReverifyHref(locale, options.returnTo)
    if (reverifyHref) {
      const params = new URLSearchParams()
      params.set("callbackUrl", options.returnTo)
      redirect(`${reverifyHref}?${params.toString()}` as Route)
    }
    await redirectToAuthInterruption(AUTH_STATUS.STEP_UP_REQUIRED, {
      callbackPath: options.returnTo,
    })
  }
}
