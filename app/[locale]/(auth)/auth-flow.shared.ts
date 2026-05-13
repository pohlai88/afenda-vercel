import { resolvePostAuthCallbackUrl } from "#lib/auth/callback-path"
import { stripLeadingLocalePrefix } from "#lib/i18n/locales.shared"

function firstQueryValue(v: string | string[] | undefined): string | undefined {
  if (typeof v === "string") return v
  if (Array.isArray(v)) return v[0]
  return undefined
}

/** Prefill only; auth is unchanged. Caps length to avoid log noise. */
export function parsePrefillEmail(
  raw: string | string[] | undefined
): string | undefined {
  const s = firstQueryValue(raw)?.trim().slice(0, 320)
  if (!s?.includes("@")) return undefined
  return s
}

export function parseStepUp(raw: string | string[] | undefined): boolean {
  return (
    raw === "1" ||
    raw === "true" ||
    (Array.isArray(raw) && raw.some((v) => v === "1" || v === "true"))
  )
}

export function parsePostAuthPath(
  raw: string | string[] | undefined,
  fallback: string
): string {
  return resolvePostAuthCallbackUrl(firstQueryValue(raw), fallback)
}

export function buildCheckEmailHref({
  email,
  callbackUrl,
}: {
  email?: string
  callbackUrl?: string
}): string {
  const params = new URLSearchParams()
  if (email) params.set("email", email)
  if (callbackUrl) params.set("callbackUrl", callbackUrl)
  const query = params.toString()
  return query ? `/check-email?${query}` : "/check-email"
}

export function buildVerifyEmailHref({
  email,
  callbackUrl,
}: {
  email?: string
  callbackUrl?: string
}): string {
  const params = new URLSearchParams()
  if (email) params.set("email", email)
  if (callbackUrl) params.set("callbackUrl", callbackUrl)
  const query = params.toString()
  return query ? `/verify-email?${query}` : "/verify-email"
}

/** next-intl `useRouter` expects locale-internal `href`; server gives locale-prefixed paths. */
export function localeAwarePathToClientRoute(
  localeAwarePathWithOptionalQuery: string
): `/${string}` {
  const raw = localeAwarePathWithOptionalQuery.trim()
  const qIdx = raw.indexOf("?")
  const pathOnly = qIdx >= 0 ? raw.slice(0, qIdx) : raw
  const query = qIdx >= 0 ? raw.slice(qIdx) : ""
  const stripped = stripLeadingLocalePrefix(pathOnly)
  const pathnameWithoutLocale =
    stripped?.pathnameWithoutLocale ??
    (pathOnly.startsWith("/") ? pathOnly : `/${pathOnly}`)
  return `${pathnameWithoutLocale}${query}` as `/${string}`
}

type AuthResponseLike = {
  token?: string | null
  user?: {
    emailVerified?: boolean | null
  } | null
}

function readAuthResponsePayload(value: unknown): AuthResponseLike | null {
  if (!value || typeof value !== "object") return null

  const root = value as Record<string, unknown>
  const nested =
    root.data && typeof root.data === "object"
      ? (root.data as Record<string, unknown>)
      : root

  const user =
    nested.user && typeof nested.user === "object"
      ? (nested.user as Record<string, unknown>)
      : null

  return {
    token:
      typeof nested.token === "string" || nested.token === null
        ? nested.token
        : undefined,
    user: user
      ? {
          emailVerified:
            typeof user.emailVerified === "boolean" ? user.emailVerified : null,
        }
      : null,
  }
}

export function authResponseHasSessionToken(value: unknown): boolean {
  return Boolean(readAuthResponsePayload(value)?.token)
}

export function resolvePostSignUpPath(
  value: unknown,
  opts: {
    email: string
    postAuthPath: string
  }
): string {
  const payload = readAuthResponsePayload(value)
  if (payload?.token || payload?.user?.emailVerified) {
    return opts.postAuthPath
  }

  return buildCheckEmailHref({
    email: opts.email,
    callbackUrl: opts.postAuthPath,
  })
}
