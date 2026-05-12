import { listUserOrganizationsForSwitcher } from "#features/org-admin/server"

import { WorkbenchCommandTrigger } from "./workbench-command-trigger"
import { WorkbenchUtilityLeftRail } from "./workbench-utility-left-rail"
import { WorkbenchUtilityRightRail } from "./workbench-utility-right-rail"
import { WorkbenchUtilityWidgetPreferencesProvider } from "./workbench-utility-widget-preferences"

export type NexusUtilityBarRowProps = {
  orgSlug: string
  orgName: string
  orgId: string
  userId: string
  userEmail: string
}

/**
 * Async row: org list for rail widgets + admin visibility.
 * Wrapped in Suspense from {@link WorkbenchUtilityBar}.
 */
export async function WorkbenchUtilityBarRow({
  orgSlug,
  orgName,
  orgId,
  userId,
  userEmail,
}: NexusUtilityBarRowProps) {
  const userOrgs = await listUserOrganizationsForSwitcher(userId)
  const currentOrg = userOrgs.find((o) => o.id === orgId)
  const showOrgAdminSettings =
    currentOrg?.role === "admin" || currentOrg?.role === "owner"

  return (
    <WorkbenchUtilityWidgetPreferencesProvider
      orgSlug={orgSlug}
      canOpenMarketplace={showOrgAdminSettings}
      multiOrg={userOrgs.length > 1}
    >
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
        />
      </div>
    </WorkbenchUtilityWidgetPreferencesProvider>
  )
}
