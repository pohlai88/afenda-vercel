export const PORTAL_SLUG_MAX_LENGTH = 128

const PORTAL_SLUG_RE = /^[a-z0-9](?:[a-z0-9_-]{0,126}[a-z0-9])?$/

export function normalizePortalSlugParam(raw: string): string | null {
  let decoded = raw
  try {
    decoded = decodeURIComponent(raw)
  } catch {
    return null
  }

  const value = decoded.trim().toLowerCase()

  if (value.length === 0 || value.length > PORTAL_SLUG_MAX_LENGTH) return null
  if (
    value.includes("/") ||
    value.includes("\\") ||
    value.includes("\0") ||
    value.includes("..")
  ) {
    return null
  }

  return PORTAL_SLUG_RE.test(value) ? value : null
}
