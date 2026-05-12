import { OrbitPage } from "#features/planner/server"
import { canActInOrganization } from "#lib/auth"
import { ensureAppLocale } from "#lib/i18n/locales.shared"
import { requireOrgSession } from "#lib/tenant"

export const dynamic = "force-dynamic"

export default async function OrbitTodayPage({
  params,
  searchParams,
}: PageProps<"/[locale]/o/[orgSlug]/dashboard/orbit/today">) {
  const [{ locale: localeRaw, orgSlug }, session, query] = await Promise.all([
    params,
    requireOrgSession(),
    searchParams,
  ])
  ensureAppLocale(localeRaw)
  const canManageNotices = await canActInOrganization(
    session.userId,
    session.user.role,
    session.organizationId,
    "admin"
  )

  return (
    <OrbitPage
      scope={{
        scopeKind: "organization",
        organizationId: session.organizationId,
      }}
      orgSlug={orgSlug}
      surface="today"
      searchParams={query}
      viewerUserId={session.userId}
      canManageNotices={canManageNotices}
    />
  )
}
