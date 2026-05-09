import { ORG_SLUG_MAX_LENGTH } from "#lib/org-slug.shared"

/**
 * Reserved URL slugs under `/o/[orgSlug]/…` — avoid collisions with product routes
 * and ambiguous single-segment paths after locale.
 */
export const RESERVED_ORG_SLUGS = new Set([
  "account",
  "admin",
  "api",
  "auth",
  "check-email",
  "contacts",
  "dashboard",
  "forgot-password",
  "integrations",
  "inventory",
  "knowledge",
  "lynx",
  "manifest",
  "new",
  "o",
  "onboarding",
  "operator",
  "organizations",
  "purchase",
  "reset-password",
  "robots",
  "sale",
  "session-expired",
  "sign-in",
  "sign-up",
  "sitemap",
  "static",
  "onething",
  "users",
  "verify-email",
])

export function isReservedOrgSlug(slug: string): boolean {
  return RESERVED_ORG_SLUGS.has(slug.toLowerCase())
}

/**
 * Derive a slug-shaped string from a human-readable organization name.
 * Does not guarantee `normalizeOrgSlugParam` accepts the result — caller must validate.
 */
export function slugifyOrganizationName(rawName: string): string {
  const trimmed = rawName.normalize("NFKD").replace(/\p{M}/gu, "").trim()
  if (!trimmed) return ""

  let s = trimmed
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "")

  if (s.length > ORG_SLUG_MAX_LENGTH) {
    s = s.slice(0, ORG_SLUG_MAX_LENGTH).replace(/-+$/g, "")
  }

  return s
}
