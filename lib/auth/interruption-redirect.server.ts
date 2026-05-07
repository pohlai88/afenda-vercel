import "server-only"

import type { Route } from "next"
import { redirect } from "next/navigation"

import { getRequestAppLocale } from "#lib/i18n/request-locale.server"

import type { AuthStatusCode } from "./auth-status.shared"
import { authInterruptionHref } from "./auth-interruption-url.shared"
import { getIntendedReturnPathFromRequest } from "./intended-path.server"

/**
 * Redirect to the shared interruption surface with canonical `authStatus` and
 * preserved intent (`callbackUrl` from `opts` or the current request path).
 */
export async function redirectToAuthInterruption(
  status: AuthStatusCode,
  opts?: {
    callbackPath?: string | null
    context?: string
    ref?: string
  }
): Promise<never> {
  const locale = await getRequestAppLocale()
  const callbackPath =
    opts?.callbackPath !== undefined && opts.callbackPath !== null
      ? opts.callbackPath
      : await getIntendedReturnPathFromRequest()
  return redirect(
    authInterruptionHref(status, {
      locale,
      ...opts,
      callbackPath,
    }) as Route
  )
}
