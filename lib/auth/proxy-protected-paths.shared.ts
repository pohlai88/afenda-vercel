/**
 * Locale-internal pathname checks for `proxy.ts` session cookie presence gate.
 * Keeps ERP (`/o/…`), portals (`/p/…`), and canonical IAM surfaces aligned.
 *
 * `/o` — bare org resolver (`app/[locale]/o/page.tsx`) requires a session.
 * `/o/{slug}/…` — tenant routes; also matched by `isOrgScopedLocaleInternalPath`.
 * `/p` and `/p/{portalSlug}/…` — portal routes; real authorization remains server-side.
 */

const PROTECTED_PATH_PREFIXES = [
  "/o",
  "/p",
  "/operator",
  "/platform",
  "/accept-invitation",
  "/bootstrap",
] as const

/** Locale-internal paths under `/o/{slug}/…` (V1 tenant surface). */
export function isOrgScopedLocaleInternalPath(
  pathnameWithoutLocale: string
): boolean {
  if (/^\/o\/[^/]+\//.test(pathnameWithoutLocale)) {
    return true
  }
  return /^\/o\/[^/]+$/.test(pathnameWithoutLocale)
}

function matchesProtectedPrefixes(
  pathnameWithoutLocale: string,
  prefixes: readonly string[]
): boolean {
  return prefixes.some(
    (prefix) =>
      pathnameWithoutLocale === prefix ||
      pathnameWithoutLocale.startsWith(`${prefix}/`)
  )
}

/** True when `proxy.ts` should require a Neon Auth session cookie (presence only). */
export function isProtectedLocaleInternalPath(
  pathnameWithoutLocale: string
): boolean {
  if (isOrgScopedLocaleInternalPath(pathnameWithoutLocale)) return true
  return matchesProtectedPrefixes(
    pathnameWithoutLocale,
    PROTECTED_PATH_PREFIXES
  )
}

/** Locale-internal sign-in path for cookie-gate redirects (single Neon Auth stack). */
export function localeInternalSignInPathForProtectedRoute(): "/sign-in" {
  return "/sign-in"
}
