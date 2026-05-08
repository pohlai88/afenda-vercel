import {
  AUTH_CONTEXT_QUERY_KEY,
  AUTH_STATUS_QUERY_KEY,
  AUTH_SUPPORT_REF_QUERY_KEY,
  type AuthStatusCode,
  sanitizeAuthContext,
} from "#lib/auth/auth-status.shared"
import { resolvePostAuthCallbackUrl } from "#lib/auth/callback-path"
import { toLocalePath, type AppLocale } from "#lib/i18n/locales.shared"

export type AuthInterruptionHrefV2Options = {
  locale: AppLocale
  callbackPath?: string | null
  context?: string
  ref?: string
}

/**
 * Bookmarkable interruption URL (`/{locale}/session-expired`).
 */
export function authInterruptionHrefV2(
  status: AuthStatusCode,
  opts: AuthInterruptionHrefV2Options
): string {
  const { locale } = opts
  const q = new URLSearchParams()
  q.set(AUTH_STATUS_QUERY_KEY, status)
  const callback = resolvePostAuthCallbackUrl(
    opts.callbackPath ?? null,
    toLocalePath(locale, "/")
  )
  q.set("callbackUrl", callback)
  const ctx =
    opts.context != null ? sanitizeAuthContext(opts.context) : undefined
  if (ctx) q.set(AUTH_CONTEXT_QUERY_KEY, ctx)
  const ref = opts.ref?.trim()
  if (ref) q.set(AUTH_SUPPORT_REF_QUERY_KEY, ref)
  return `${toLocalePath(locale, "/session-expired")}?${q.toString()}`
}
