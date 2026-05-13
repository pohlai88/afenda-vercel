import {
  isInstalledNexusRightUtilityWidgetId,
  type NexusRightUtilityWidgetId,
} from "#features/nexus"
import { listUserOrganizationsForSwitcher } from "#features/org-admin/server"
import {
  listOrgCapabilityPolicy,
  listUserCapabilityPreferences,
  resolveCapabilitiesForViewer,
} from "#features/marketplace/server"
import { APP_LOCALES } from "#lib/i18n/locales.shared"

import { WorkbenchCommandTrigger } from "./workbench-command-trigger"
import { WorkbenchLeftUtilityBar } from "./left-utility-bar/workbench-left-utility-bar"
import { WorkbenchRightUtilityBar } from "./right-utility-bar/workbench-right-utility-bar"

export type WorkbenchUtilityBarRowProps = {
  orgSlug: string
  orgName: string
  orgId: string
  userId: string
  userEmail: string
}

/**
 * Async row: resolves the personal utility-rail composition on the
 * server using the marketplace capability resolver, then hands a
 * stable, ordered id list to the right rail. The rail itself is
 * dumb — it does not load preferences, run availability checks, or
 * own a customize sheet anymore (those now live under
 * `/{locale}/marketplace`).
 *
 * Wrapped in Suspense from {@link WorkbenchUtilityBar}.
 */
export async function WorkbenchUtilityBarRow({
  orgSlug,
  orgName,
  orgId,
  userId,
  userEmail,
}: WorkbenchUtilityBarRowProps) {
  const [userOrgs, orgPolicy, userPreferences] = await Promise.all([
    listUserOrganizationsForSwitcher(userId),
    listOrgCapabilityPolicy(orgId),
    listUserCapabilityPreferences({ organizationId: orgId, userId }),
  ])

  const currentOrg = userOrgs.find((o) => o.id === orgId)
  const displayOrgName = currentOrg?.name?.trim() || orgName
  const showOrgAdminSettings =
    currentOrg?.role === "admin" || currentOrg?.role === "owner"

  const resolved = resolveCapabilitiesForViewer({
    viewer: {
      isAdmin: showOrgAdminSettings,
      // L1 rail runs server-side — touch detection is reserved for
      // a future client-side re-resolution pass; until then we keep
      // mobile-only widgets out of the SSR'd rail.
      isMobile: false,
      multiOrg: userOrgs.length > 1,
      multiLocale: APP_LOCALES.length > 1,
    },
    orgPolicy,
    userPreferences,
  })
  const visibleRightIds = resolved.visibleIds.filter(
    (id): id is NexusRightUtilityWidgetId =>
      id !== "right.console" && isInstalledNexusRightUtilityWidgetId(id)
  )

  return (
    <div className="relative flex h-(--af-l1-height) items-center justify-between gap-2">
      <div className="flex min-w-0 flex-1 items-center justify-start">
        <WorkbenchLeftUtilityBar
          orgSlug={orgSlug}
          orgName={displayOrgName}
          orgId={orgId}
          userOrgs={userOrgs}
          showOrgLoadingBay={userOrgs.length > 1}
        />
      </div>

      <div className="pointer-events-none absolute top-1/2 left-1/2 flex w-full -translate-x-1/2 -translate-y-1/2 justify-center px-14 sm:px-24">
        <WorkbenchCommandTrigger className="pointer-events-auto" />
      </div>

      <div className="flex min-w-0 flex-1 items-center justify-end">
        <WorkbenchRightUtilityBar
          orgSlug={orgSlug}
          orgName={displayOrgName}
          orgId={orgId}
          userEmail={userEmail}
          showOrgAdminSettings={showOrgAdminSettings}
          visibleRightIds={visibleRightIds}
        />
      </div>
    </div>
  )
}
