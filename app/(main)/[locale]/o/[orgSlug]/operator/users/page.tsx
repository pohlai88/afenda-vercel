import { getTranslations } from "next-intl/server"

import { Button } from "#components2/ui/button"
import { Link } from "#i18n/navigation"

import {
  PLATFORM_ADMIN_USERS_PAGE_SIZE,
  PlatformAdminUsersSearch,
  PlatformAdminUsersTable,
  listUsersForPlatformAdmin,
  loadPlatformOperatorUsersSearchParams,
  organizationOperatorPath,
  sanitizePlatformOperatorUsersSearchParams,
  serializePlatformOperatorUsersSearchParams,
} from "#features/platform-admin"
import { requireGlobalAdminSession } from "#lib/auth"

export default async function OrganizationPlatformAdminUsersPage({
  params,
  searchParams,
}: PageProps<"/[locale]/o/[orgSlug]/operator/users">) {
  const { orgSlug } = await params
  const session = await requireGlobalAdminSession()

  const t = await getTranslations("PlatformAdmin.users")

  const loaded = await loadPlatformOperatorUsersSearchParams(searchParams)
  const { q: search, page } = sanitizePlatformOperatorUsersSearchParams(loaded)

  const limit = PLATFORM_ADMIN_USERS_PAGE_SIZE
  const offset = (page - 1) * limit

  const result = await listUsersForPlatformAdmin({
    searchValue: search,
    limit,
    offset,
  })

  const totalPages = Math.max(1, Math.ceil(result.total / limit))
  const basePath = organizationOperatorPath(orgSlug, "users")

  function buildPageHref(targetPage: number) {
    return serializePlatformOperatorUsersSearchParams(basePath, {
      q: search.length > 0 ? search : null,
      page: targetPage <= 1 ? null : targetPage,
    })
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
          basePath={organizationOperatorPath(orgSlug, "users")}
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
