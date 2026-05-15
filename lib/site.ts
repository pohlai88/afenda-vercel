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

/**
 * Host patterns for Better Auth `baseURL.allowedHosts` and Next.js
 * `experimental.serverActions.allowedOrigins` — same inputs as origin allowlists.
 *
 * - `BETTER_AUTH_URL`, public site URL (via {@link getSiteUrl}), and CSV
 *   `BETTER_AUTH_TRUSTED_ORIGINS` entries contribute hosts.
 * - In development, localhost dev server hosts are included.
 * - On Vercel, `*.vercel.app` is included for preview deployments.
 *
 * Production builds should not rely on localhost in env; keep prod origins explicit.
 */
export function betterAuthAllowedHostsFromEnv(): string[] {
  const hosts = new Set<string>()

  const addFromOriginish = (raw: string) => {
    const trimmed = raw.trim()
    if (!trimmed) return
    const withProto = trimmed.includes("://") ? trimmed : `https://${trimmed}`
    try {
      const u = new URL(withProto)
      const h = u.hostname
      const port = u.port
      hosts.add(port ? `${h}:${port}` : h)
    } catch {
      const hostport = trimmed.replace(/^https?:\/\//, "").replace(/\/+$/, "")
      if (hostport) hosts.add(hostport)
    }
  }

  const betterAuthUrl = process.env.BETTER_AUTH_URL?.trim()
  if (betterAuthUrl) addFromOriginish(betterAuthUrl)
  addFromOriginish(getSiteUrl())

  const csv = process.env.BETTER_AUTH_TRUSTED_ORIGINS?.trim()
  if (csv) {
    for (const part of csv.split(",")) {
      const x = part.trim()
      if (x) addFromOriginish(x)
    }
  }

  if (process.env.NODE_ENV === "development") {
    hosts.add("localhost:3000")
    hosts.add("127.0.0.1:3000")
  }

  if (process.env.VERCEL) {
    hosts.add("*.vercel.app")
  }

  return [...hosts]
}

/**
 * Full origin strings for Better Auth `trustedOrigins` (CSRF / open redirect).
 * Aligns inputs with {@link betterAuthAllowedHostsFromEnv}: `BETTER_AUTH_URL`,
 * {@link getSiteUrl}, and `BETTER_AUTH_TRUSTED_ORIGINS`.
 *
 * - On Vercel, adds `https://*.vercel.app` for preview host CSRF coverage.
 * - In production, drops localhost / 127.0.0.1 origins (Better Auth security guidance).
 */
export function betterAuthTrustedOriginsFromEnv(): string[] {
  const out = new Set<string>()

  const add = (raw: string) => {
    const trimmed = raw.trim()
    if (!trimmed) return
    if (!trimmed.includes("://") && trimmed.includes("*")) {
      out.add(trimmed)
      return
    }
    const withProto = trimmed.includes("://") ? trimmed : `https://${trimmed}`
    try {
      const u = new URL(withProto)
      out.add(`${u.protocol}//${u.host}`)
    } catch {
      out.add(trimmed.replace(/\/$/, ""))
    }
  }

  const betterAuthUrl = process.env.BETTER_AUTH_URL?.trim()
  if (betterAuthUrl) add(betterAuthUrl)
  add(getSiteUrl())

  const csv = process.env.BETTER_AUTH_TRUSTED_ORIGINS?.trim()
  if (csv) {
    for (const part of csv.split(",")) {
      const x = part.trim()
      if (x) add(x)
    }
  }

  if (process.env.VERCEL) {
    out.add("https://*.vercel.app")
  }

  let list = [...out]
  if (process.env.NODE_ENV === "production") {
    list = list.filter((o) => {
      if (o.includes("*")) return true
      try {
        const u = new URL(o.includes("://") ? o : `https://${o}`)
        const h = u.hostname
        return h !== "localhost" && h !== "127.0.0.1"
      } catch {
        return true
      }
    })
  }

  return list
}

export const SITE_NAME = "Afenda" as const

export const SITE_DESCRIPTION = "Afenda on Next.js" as const

/**
 * Tab icons: `metadata.icons` + `shortcut` in `app/layout.tsx` — transparent `APP_ICON_*`
 * for light/dark `prefers-color-scheme`. **`/favicon.ico`** is a multi-size ICO generated
 * by `pnpm icons:favicon` (`public/` + `app/`). `app/layout.tsx` `generateMetadata` resolves
 * `metadataBase` from the request host so tab icons load on the deployment you’re viewing.
 * Maskable: PWA manifest only.
 */
export const FAVICON_ICO = "/favicon.ico" as const

export const APP_ICON_192_PNG =
  "/icons/afenda-icon-192-transparent.png" as const

export const APP_ICON_512_PNG =
  "/icons/afenda-icon-512-transparent.png" as const

export const APP_ICON_MASKABLE_512_PNG =
  "/icons/afenda-icon-512-maskable.png" as const

export const APP_ICON_APPLE_180_PNG =
  "/icons/afenda-icon-180-transparent.png" as const

/** Nexus + Console utility-bar identity control (`public/erp-icon/erp-user-avatar.png`). */
export const ERP_UTILITY_AVATAR_PNG = "/erp-icon/erp-user-avatar.png" as const

/** Workbench L1 utility-bar apps launcher disc (`public/erp-icon/multiple-apps.png`). */
export const ERP_UTILITY_MULTIPLE_APPS_PNG =
  "/erp-icon/multiple-apps.png" as const

/** Operational scope policy disc (`public/erp-icon/operationpolicy.png`). */
export const ERP_UTILITY_POLICY_PNG = "/erp-icon/operationpolicy.png" as const

/** Lynx module identity in dashboard chrome (sidebar, command palette). */
export const LYNX_MODULE_NAV_ICON_PNG = "/icons/lynx/lynx-3d.png" as const

/** Lynx floating summon mascot (`public/icons/lynx/lynx-smart.png`). */
export const LYNX_SUMMON_MASCOT_PNG = "/icons/lynx/lynx-smart.png" as const

/** Marketing lockups — use in wide headers / auth hero; not for favicon or maskable PWA. */
export const BRAND_COMBINED_LOCKUP_SVG =
  "/afenda-brand/afenda-combined-lockup-full-color-transparent.svg" as const

export const BRAND_COMBINED_LOCKUP_PNG =
  "/afenda-brand/afenda-combined-lockup-full-color-transparent.png" as const

/** Dark-canvas lockup keyed to transparent (`scripts/knockout-dark-lockup-bg.mjs`). */
export const BRAND_COMBINED_LOCKUP_DARK_PNG =
  "/afenda-brand/brand-guideline/dark-full-icon-bar-transparent.png" as const

export const BRAND_TYPOGRAPHY_LOCKUP_SVG =
  "/afenda-brand/afenda-typography-lockup-transparent.svg" as const

export const BRAND_WORDMARK_MONO_SVG =
  "/afenda-brand/afenda-typography-wordmark-mono-black-on-light.svg" as const

/** Paired with metadataBase for Open Graph / Twitter (square mark). */
export const DEFAULT_OG_IMAGE = APP_ICON_512_PNG
