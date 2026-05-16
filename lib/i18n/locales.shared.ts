import type { Route } from "next"

/**
 * Single source of truth for supported UI locales (path prefix + catalogs).
 * Ask-docs launch set: en, zh-CN, vi, ms (`zh-CN` allows `zh-TW` later without migration).
 */
export const APP_LOCALES = ["en", "zh-CN", "vi", "ms"] as const

export type AppLocale = (typeof APP_LOCALES)[number]

export const DEFAULT_APP_LOCALE: AppLocale = "en"

export function isAppLocale(value: string): value is AppLocale {
  return (APP_LOCALES as readonly string[]).includes(value)
}

/** Route `[locale]` param → `AppLocale` (falls back to default if invalid). */
export function ensureAppLocale(value: string): AppLocale {
  return isAppLocale(value) ? value : DEFAULT_APP_LOCALE
}

/** Same-origin path segment after `/` (e.g. `/dashboard`, `/`). */
export type AppPath = `/${string}`

/**
 * Prefix a pathname with `/{locale}` (`localePrefix: "always"`).
 * Idempotent if `path` is already `/{locale}` or `/{locale}/...`.
 * Locale must be explicit — no implicit default.
 */
export function toLocalePath(
  locale: AppLocale,
  path: AppPath | Route
): AppPath {
  const raw = (path.startsWith("/") ? path : `/${path}`) as AppPath
  if (raw === `/${locale}` || raw.startsWith(`/${locale}/`)) {
    return raw
  }
  if (raw === "/" || raw === ("" as AppPath)) {
    return `/${locale}` as AppPath
  }
  return `/${locale}${raw}` as AppPath
}

/**
 * Next.js `revalidatePath` pattern for all locales under `app/[locale]/...`.
 * @see https://nextjs.org/docs/app/api-reference/functions/revalidatePath
 */
export function toLocaleRoutePattern(path: AppPath): AppPath {
  const tail = path === "/" ? "" : path
  return `/[locale]${tail}` as AppPath
}

/**
 * `revalidatePath` pattern for org-scoped dashboard routes
 * (`app/[locale]/o/[orgSlug]/dashboard/...`), invalidating all locales and orgs.
 *
 * @param dashboardTail — path after `/dashboard` with a leading slash, e.g.
 *   `/contacts`, `/sale`, or `""` for the dashboard index segment.
 */
export function toLocaleOrgDashboardRevalidatePattern(
  dashboardTail: string
): AppPath {
  const tail =
    dashboardTail === "" || dashboardTail === "/"
      ? ""
      : dashboardTail.startsWith("/")
        ? dashboardTail
        : `/${dashboardTail}`
  return `/[locale]/o/[orgSlug]/dashboard${tail}` as AppPath
}

/** `revalidatePath` pattern for the Nexus field (`/o/[orgSlug]/nexus`). */
export function toLocaleOrgNexusRevalidatePattern(): AppPath {
  return `/[locale]/o/[orgSlug]/nexus` as AppPath
}

/**
 * `revalidatePath` for org admin workbench routes (`/o/[orgSlug]/admin/...`).
 */
export function toLocaleOrgAdminRevalidatePattern(adminTail: string): AppPath {
  const tail =
    adminTail === "" || adminTail === "/"
      ? ""
      : adminTail.startsWith("/")
        ? adminTail
        : `/${adminTail}`
  return `/[locale]/o/[orgSlug]/admin${tail}` as AppPath
}

/**
 * `revalidatePath` for the Capability Registry surface (`/{locale}/marketplace/...`).
 * Marketplace is session-relative (active org resolved from the user's session) and
 * therefore not under `/o/[orgSlug]/...` — it has its own root pattern.
 */
export function toLocaleMarketplaceRevalidatePattern(
  marketplaceTail: string = ""
): AppPath {
  const tail =
    marketplaceTail === "" || marketplaceTail === "/"
      ? ""
      : marketplaceTail.startsWith("/")
        ? marketplaceTail
        : `/${marketplaceTail}`
  return `/[locale]/marketplace${tail}` as AppPath
}

export type StrippedLocalePath = {
  locale: AppLocale
  /** Pathname without the leading `/{locale}` (e.g. `/dashboard` or `/`). */
  pathnameWithoutLocale: string
}

/**
 * Parse `/{locale}/...` for known locales. Returns null if missing or invalid
 * (including `/en/en/...` double-prefix).
 */
export function stripLeadingLocalePrefix(
  pathname: string
): StrippedLocalePath | null {
  const segments = pathname.split("/").filter(Boolean)
  if (!segments[0] || !isAppLocale(segments[0])) {
    return null
  }
  if (segments.length > 1 && isAppLocale(segments[1])) {
    return null
  }
  const locale = segments[0]
  const tail = segments.slice(1)
  const pathnameWithoutLocale = tail.length === 0 ? "/" : `/${tail.join("/")}`
  return { locale, pathnameWithoutLocale }
}
