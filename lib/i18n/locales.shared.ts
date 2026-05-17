import type { Route } from "next"

/**
 * Full launch locale set (path prefix + catalogs).
 * Ask-docs launch set: en, zh-CN, vi, ms (`zh-CN` allows `zh-TW` later without migration).
 */
export const FULL_APP_LOCALES = ["en", "zh-CN", "vi", "ms"] as const

export type FullAppLocale = (typeof FULL_APP_LOCALES)[number]

/** Locale id — always the full launch union; use {@link APP_LOCALES} for active routing. */
export type AppLocale = FullAppLocale

export const DEFAULT_APP_LOCALE: AppLocale = "en"

/**
 * Temporary refactor gate: English-only routing and static params.
 * See **ADR-0028** — resume checklist before deployment.
 */
export function isAfendaSingleLocaleRefactorMode(): boolean {
  const raw =
    process.env.AFENDA_I18N_SINGLE_LOCALE ??
    process.env.NEXT_PUBLIC_AFENDA_I18N_SINGLE_LOCALE
  return raw === "1" || raw === "true"
}

/** Active locales for routing, `generateStaticParams`, and message catalogs. */
export const APP_LOCALES: readonly AppLocale[] = isAfendaSingleLocaleRefactorMode()
  ? (["en"] as const)
  : FULL_APP_LOCALES

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
 * `revalidatePath` for the org-scoped Capability Registry (`/o/[orgSlug]/marketplace/...`).
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
  return `/[locale]/o/[orgSlug]/marketplace${tail}` as AppPath
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
