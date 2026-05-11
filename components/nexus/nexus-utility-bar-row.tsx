import { listUserOrganizationsForSwitcher } from "#features/org-admin/server"

import { NexusCommandTrigger } from "./nexus-command-trigger"
import { NexusUtilityLeftRail } from "./nexus-utility-left-rail"
import { NexusUtilityRightRail } from "./nexus-utility-right-rail"
import { NexusUtilityWidgetPreferencesProvider } from "./nexus-utility-widget-preferences"

export type NexusUtilityBarRowProps = {
  orgSlug: string
  orgName: string
  orgId: string
  userId: string
  userEmail: string
}

/**
 * Async row: org list for rail widgets + admin visibility.
 * Wrapped in Suspense from {@link NexusUtilityBar}.
 */
export async function NexusUtilityBarRow({
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
    <NexusUtilityWidgetPreferencesProvider
      orgSlug={orgSlug}
      canOpenMarketplace={showOrgAdminSettings}
      multiOrg={userOrgs.length > 1}
    >
      <div className="grid h-12 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2">
        <NexusUtilityLeftRail orgSlug={orgSlug} orgName={orgName} />

        <div className="flex min-w-0 justify-center px-2 sm:px-4">
          <NexusCommandTrigger />
        </div>

        <NexusUtilityRightRail
          orgSlug={orgSlug}
          orgName={orgName}
          orgId={orgId}
          userEmail={userEmail}
          userOrgs={userOrgs}
          showOrgAdminSettings={showOrgAdminSettings}
        />
      </div>
    </NexusUtilityWidgetPreferencesProvider>
  )
}
