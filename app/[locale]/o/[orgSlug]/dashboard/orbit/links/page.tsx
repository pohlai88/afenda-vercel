import { OrbitPage } from "#features/planner/server"
import { canUseErpPermissionForCurrentOrg } from "#features/erp-rbac/server"
import { ensureAppLocale } from "#lib/i18n/locales.shared"
import { requireOrgSession } from "#lib/tenant"

export const dynamic = "force-dynamic"

export default async function OrbitLinksPage({
  params,
  searchParams,
}: PageProps<"/[locale]/o/[orgSlug]/dashboard/orbit/links">) {
  const [{ locale: localeRaw, orgSlug }, session, query] = await Promise.all([
    params,
    requireOrgSession(),
    searchParams,
  ])
  ensureAppLocale(localeRaw)
  const canManageNotices = await canUseErpPermissionForCurrentOrg({
    module: "planner",
    object: "notice",
    function: "update",
  })

  return (
    <OrbitPage
      scope={{
        scopeKind: "organization",
        organizationId: session.organizationId,
      }}
      orgSlug={orgSlug}
      surface="links"
      searchParams={query}
      viewerUserId={session.userId}
      canManageNotices={canManageNotices}
    />
  )
}
