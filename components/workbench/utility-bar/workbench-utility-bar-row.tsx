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
import { WorkbenchUtilityLeftRail } from "./workbench-utility-left-rail"
import { WorkbenchUtilityRightRail } from "./workbench-utility-right-rail"
import { WorkbenchUtilityWidgetMigrator } from "./workbench-utility-widget-migrator"

export type NexusUtilityBarRowProps = {
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
 * One-shot legacy migration is delegated to
 * `WorkbenchUtilityWidgetMigrator`, a hidden client island that
 * drains the old `localStorage` payload into per-user DB rows
 * exactly once and clears the key. After v1, the migrator can
 * shrink to `null` and the localStorage code path is gone.
 *
 * Wrapped in Suspense from {@link WorkbenchUtilityBar}.
 */
export async function WorkbenchUtilityBarRow({
  orgSlug,
  orgName,
  orgId,
  userId,
  userEmail,
}: NexusUtilityBarRowProps) {
  const [userOrgs, orgPolicy, userPreferences] = await Promise.all([
    listUserOrganizationsForSwitcher(userId),
    listOrgCapabilityPolicy(orgId),
    listUserCapabilityPreferences({ organizationId: orgId, userId }),
  ])

  const currentOrg = userOrgs.find((o) => o.id === orgId)
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
    isInstalledNexusRightUtilityWidgetId
  ) as NexusRightUtilityWidgetId[]

  return (
    <>
      <div className="grid h-(--af-l1-height) grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2">
        <WorkbenchUtilityLeftRail orgSlug={orgSlug} orgName={orgName} />

        <div className="flex min-w-0 justify-center px-2 sm:px-4">
          <WorkbenchCommandTrigger />
        </div>

        <WorkbenchUtilityRightRail
          orgSlug={orgSlug}
          orgName={orgName}
          orgId={orgId}
          userEmail={userEmail}
          userOrgs={userOrgs}
          showOrgAdminSettings={showOrgAdminSettings}
          visibleRightIds={visibleRightIds}
        />
      </div>
      <WorkbenchUtilityWidgetMigrator />
    </>
  )
}
