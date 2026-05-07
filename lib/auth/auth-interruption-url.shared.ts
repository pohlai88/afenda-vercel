import {
  AUTH_CONTEXT_QUERY_KEY,
  AUTH_STATUS_QUERY_KEY,
  AUTH_SUPPORT_REF_QUERY_KEY,
  type AuthStatusCode,
  sanitizeAuthContext,
} from "./auth-status.shared"
import { toLocalePath, type AppLocale } from "#lib/i18n/locales.shared"

import { resolvePostAuthCallbackUrl } from "./callback-path"

export type AuthInterruptionHrefOptions = {
  locale: AppLocale
  callbackPath?: string | null
  context?: string
  ref?: string
}

/**
 * Build a safe, bookmarkable interruption URL (same-origin relative).
 */
export function authInterruptionHref(
  status: AuthStatusCode,
  opts: AuthInterruptionHrefOptions
): string {
  const { locale } = opts
  const q = new URLSearchParams()
  q.set(AUTH_STATUS_QUERY_KEY, status)
  const callback = resolvePostAuthCallbackUrl(
    opts.callbackPath ?? null,
    toLocalePath(locale, "/dashboard")
  )
  q.set("callbackUrl", callback)
  const ctx =
    opts.context != null ? sanitizeAuthContext(opts.context) : undefined
  if (ctx) q.set(AUTH_CONTEXT_QUERY_KEY, ctx)
  const ref = opts.ref?.trim()
  if (ref) q.set(AUTH_SUPPORT_REF_QUERY_KEY, ref)
  return `${toLocalePath(locale, "/session-expired")}?${q.toString()}`
}
