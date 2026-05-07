/**
 * Organization slug format for URL segment `app/[locale]/o/[orgSlug]/…`.
 * Aligns with typical Better Auth / Postgres slug constraints (no path chars).
 */

/** Max length for URL segment + DB `organization.slug` lookups. */
export const ORG_SLUG_MAX_LENGTH = 128

/**
 * `^[a-z0-9]` … lowercase slug with single internal hyphens/underscores.
 * (Adjust if product allows uppercase Unicode slugs.)
 */
const ORG_SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9_-]{0,126}[a-z0-9])?$/

/**
 * Decode and validate a dynamic `[orgSlug]` param. Returns `null` if unusable.
 */
export function normalizeOrgSlugParam(raw: string): string | null {
  if (typeof raw !== "string") {
    return null
  }
  let decoded: string
  try {
    decoded = decodeURIComponent(raw)
  } catch {
    return null
  }
  const t = decoded.trim()
  if (t.length === 0 || t.length > ORG_SLUG_MAX_LENGTH) {
    return null
  }
  if (t.includes("/") || t.includes("\\") || t.includes("\0")) {
    return null
  }
  if (t.includes("..")) {
    return null
  }
  if (!ORG_SLUG_PATTERN.test(t)) {
    return null
  }
  return t
}
