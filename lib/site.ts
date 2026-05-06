/**
 * Canonical site origin for metadata, robots, and sitemap.
 *
 * Resolution order: `NEXT_PUBLIC_SITE_URL` → `NEXT_PUBLIC_APP_URL` (template alias) →
 * `VERCEL_URL` (deployment host) → localhost. On Vercel production, set `NEXT_PUBLIC_SITE_URL`
 * to your custom domain so OG/metadata match `BETTER_AUTH_URL`.
 */
export function getSiteUrl(): string {
  const fromEnv =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim()
  if (fromEnv) return fromEnv.replace(/\/$/, "")

  const vercel = process.env.VERCEL_URL?.trim()
  if (vercel) return `https://${vercel.replace(/^https?:\/\//, "")}`

  return "http://localhost:3000"
}

export const SITE_NAME = "Afenda" as const

export const SITE_DESCRIPTION = "Afenda on Next.js" as const

/** Relative to site root; paired with metadataBase for OG/Twitter. */
export const DEFAULT_OG_IMAGE = "/icons/afenda-icon-512-transparent.png" as const
