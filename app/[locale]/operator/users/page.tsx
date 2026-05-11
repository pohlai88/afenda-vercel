import type { Route } from "next"

import { getTranslations } from "next-intl/server"

import { Button } from "#components/ui/button"

import { Link } from "#i18n/navigation"

import {
  PLATFORM_ADMIN_USERS_PAGE_SIZE,
  PlatformAdminUsersSearch,
  PlatformAdminUsersTable,
  listUsersForPlatformAdmin,
  platformAdminPath,
} from "#features/platform-admin"
import {
  searchParamFirst,
  searchParamPositiveInt,
} from "#lib/app-search-params.shared"
import { ensureAppLocale, toLocalePath } from "#lib/i18n/locales.shared"
import { requireGlobalAdminSession } from "#lib/tenant"

export default async function PlatformAdminUsersPage({
  params,
  searchParams,
}: PageProps<"/[locale]/operator/users">) {
  const { locale: localeRaw } = await params
  const locale = ensureAppLocale(localeRaw)
  const sp = await searchParams
  const session = await requireGlobalAdminSession()

  const t = await getTranslations("PlatformAdmin.users")

  const search = searchParamFirst(sp, "q") ?? ""
  const page = searchParamPositiveInt(sp, "page", 1)
  const limit = PLATFORM_ADMIN_USERS_PAGE_SIZE
  const offset = (page - 1) * limit

  const result = await listUsersForPlatformAdmin({
    searchValue: search,
    limit,
    offset,
  })

  const totalPages = Math.max(1, Math.ceil(result.total / limit))
  const basePath = toLocalePath(locale, platformAdminPath("users"))

  function buildPageHref(targetPage: number): Route {
    const qs = new URLSearchParams()
    if (search) qs.set("q", search)
    if (targetPage > 1) qs.set("page", String(targetPage))
    const query = qs.size > 0 ? `?${qs.toString()}` : ""
    return `${basePath}${query}` as Route
  }

  return (
    <div className="p-6">
      <section className="space-y-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold tracking-tight">{t("title")}</h2>
          <p className="text-sm text-muted-foreground">{t("description")}</p>
        </div>

        <PlatformAdminUsersSearch
          initialValue={search}
          basePath={platformAdminPath("users")}
        />

        <p className="text-xs text-muted-foreground" aria-live="polite">
          {t("pagination", {
            page,
            totalPages,
            total: result.total,
          })}
        </p>

        <PlatformAdminUsersTable
          users={result.users}
          currentUserId={session.userId}
        />

        <nav
          className="flex items-center gap-2"
          aria-label={t("paginationAria")}
        >
          <Button asChild variant="outline" size="sm" disabled={page <= 1}>
            <Link
              href={buildPageHref(Math.max(1, page - 1))}
              aria-disabled={page <= 1}
            >
              {t("prev")}
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
          >
            <Link
              href={buildPageHref(Math.min(totalPages, page + 1))}
              aria-disabled={page >= totalPages}
            >
              {t("next")}
            </Link>
          </Button>
        </nav>
      </section>
    </div>
  )
}
