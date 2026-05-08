import "server-only"

import type { Route } from "next"
import { redirect } from "next/navigation"

import type { AuthStatusCode } from "#lib/auth/auth-status.shared"
import { getIntendedReturnPathFromRequest } from "#lib/auth/intended-path.server"
import { getRequestAppLocale } from "#lib/i18n/request-locale.server"

import { authInterruptionHrefV2 } from "./interruption-url.shared"

export async function redirectToAuthInterruptionV2(
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
    authInterruptionHrefV2(status, {
      locale,
      ...opts,
      callbackPath,
    }) as Route
  )
}
