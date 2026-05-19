import { canUseErpPermissionForCurrentOrg } from "#features/erp-rbac/server"
import { getOrgTenantContext } from "#lib/auth"
import { ensureAppLocale } from "#lib/i18n/locales.shared"

import type { OrbitSurface } from "../planner-orbit-path.shared"
import { OrbitPage } from "../views/orbit-page"

type OrbitSearchParams = Record<string, string | string[] | undefined>

type OrbitAppsRoutePageProps = {
  localeRaw: string
  orgSlug: string
  surface: OrbitSurface
  searchParams: OrbitSearchParams
}

/** Thin-app leaf for `/apps/orbit/*` — tenant context from org layout + {@link getOrgTenantContext}. */
export async function OrbitAppsRoutePage({
  localeRaw,
  orgSlug,
  surface,
  searchParams,
}: OrbitAppsRoutePageProps) {
  ensureAppLocale(localeRaw)
  const { organizationId, userId } = await getOrgTenantContext()
  const [canManageNotices, canSearchWorkspace] = await Promise.all([
    canUseErpPermissionForCurrentOrg({
      module: "planner",
      object: "notice",
      function: "update",
    }),
    canUseErpPermissionForCurrentOrg({
      module: "planner",
      object: "workspace",
      function: "search",
    }),
  ])

  return (
    <OrbitPage
      scope={{
        scopeKind: "organization",
        organizationId,
      }}
      orgSlug={orgSlug}
      surface={surface}
      searchParams={searchParams}
      viewerUserId={userId}
      canManageNotices={canManageNotices}
      canSearchWorkspace={canSearchWorkspace}
    />
  )
}
