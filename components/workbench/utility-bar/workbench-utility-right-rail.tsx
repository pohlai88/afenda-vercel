import type { UserOrgSummary } from "#features/org-admin/client"

import { WorkbenchControlMenu } from "./workbench-control-menu"
import { WorkbenchUtilityConnectivityStatus } from "./workbench-utility-connectivity-status"
import { WorkbenchUtilityConsoleLink } from "./workbench-utility-console-link"
import { WorkbenchUtilityLayoutDensity } from "./workbench-utility-layout-density"
import { WorkbenchUtilityMarketplaceLink } from "./workbench-utility-marketplace-link"
import { WorkbenchUtilityMessenger } from "./workbench-utility-messenger"
import { WorkbenchUtilityNetworkDiagnosis } from "./workbench-utility-network-diagnosis"
import { WorkbenchUtilityFeedback } from "./workbench-utility-feedback"
import { WorkbenchUtilityNotifications } from "./workbench-utility-notifications"
import { WorkbenchUtilityQuickCreate } from "./workbench-utility-quick-create"
import { WorkbenchUtilityHelpLink } from "./workbench-utility-help-link"
import { WorkbenchUtilityInsightLink } from "./workbench-utility-insight-link"
import { WorkbenchUtilityLocaleMenu } from "./workbench-utility-locale-menu"
import { WorkbenchUtilityOrgSettingsLink } from "./workbench-utility-org-settings-link"
import { WorkbenchUtilitySearchMobile } from "./workbench-utility-search-mobile"
import { WorkbenchUtilityShortcuts } from "./workbench-utility-shortcuts"
import { WorkbenchUtilityScreenshot } from "./workbench-utility-screenshot"
import { WorkbenchUtilityStorage } from "./workbench-utility-storage"
import { WorkbenchUtilityThemeMenu } from "./workbench-utility-theme-menu"
import { WorkbenchUtilityUpload } from "./workbench-utility-upload"
import type { NexusUtilityRightWidgetId } from "./workbench-utility-widget-ids"

type NexusUtilityRightRailProps = {
  orgSlug: string
  orgName: string
  orgId: string
  userEmail: string
  userOrgs: UserOrgSummary[]
  showOrgAdminSettings: boolean
  /**
   * Resolved by the marketplace capability resolver in
   * {@link WorkbenchUtilityBarRow}. Already capped to the rail
   * limit and ordered by priority — this component is purely a
   * dispatcher.
   */
  visibleRightIds: readonly NexusUtilityRightWidgetId[]
}

/**
 * Personal / identity rail — operational shortcuts + utility icons
 * resolved server-side by the marketplace, followed by the always-on
 * identity menu.
 *
 * No client preference state lives here anymore. The composition
 * arrives from {@link WorkbenchUtilityBarRow} and the only client
 * concerns left are the per-widget interactions (notifications,
 * theme menu, etc.) that ship inside each widget component.
 */
export function WorkbenchUtilityRightRail({
  orgSlug,
  orgName,
  orgId,
  userEmail,
  userOrgs,
  showOrgAdminSettings,
  visibleRightIds,
}: NexusUtilityRightRailProps) {
  return (
    <div className="flex min-w-0 items-center justify-end gap-1.5">
      {visibleRightIds.map((id) => (
        <RightRailWidget
          key={id}
          id={id}
          orgId={orgId}
          orgSlug={orgSlug}
          showOrgAdminSettings={showOrgAdminSettings}
        />
      ))}

      {/* ── Identity (always visible) ── */}
      <WorkbenchControlMenu
        userEmail={userEmail}
        orgSlug={orgSlug}
        orgName={orgName}
        currentOrgId={orgId}
        userOrgs={userOrgs}
      />
    </div>
  )
}

function RightRailWidget({
  id,
  orgId,
  orgSlug,
  showOrgAdminSettings,
}: {
  id: NexusUtilityRightWidgetId
  orgId: string
  orgSlug: string
  showOrgAdminSettings: boolean
}) {
  switch (id) {
    case "right.marketplace":
      // Visible to every member — the marketplace itself is now
      // a personal preferences surface, not an admin-only panel.
      return <WorkbenchUtilityMarketplaceLink />
    case "right.console":
      return <WorkbenchUtilityConsoleLink />
    case "right.quickCreate":
      return <WorkbenchUtilityQuickCreate />
    case "right.notifications":
      return <WorkbenchUtilityNotifications canManage={showOrgAdminSettings} />
    case "right.insight":
      return <WorkbenchUtilityInsightLink orgSlug={orgSlug} />
    case "right.connectivity":
      return <WorkbenchUtilityConnectivityStatus />
    case "right.feedback":
      return <WorkbenchUtilityFeedback />
    case "right.messenger":
      return <WorkbenchUtilityMessenger orgId={orgId} />
    case "right.shortcuts":
      return <WorkbenchUtilityShortcuts />
    case "right.help":
      return <WorkbenchUtilityHelpLink />
    case "right.theme":
      return <WorkbenchUtilityThemeMenu />
    case "right.density":
      return <WorkbenchUtilityLayoutDensity />
    case "right.locale":
      return <WorkbenchUtilityLocaleMenu />
    case "right.storage":
      return <WorkbenchUtilityStorage />
    case "right.screenshot":
      return <WorkbenchUtilityScreenshot orgId={orgId} />
    case "right.upload":
      return <WorkbenchUtilityUpload orgId={orgId} />
    case "right.settings":
      return showOrgAdminSettings ? (
        <WorkbenchUtilityOrgSettingsLink orgSlug={orgSlug} />
      ) : null
    case "right.diagnosis":
      return <WorkbenchUtilityNetworkDiagnosis />
    case "right.searchMobile":
      return <WorkbenchUtilitySearchMobile />
  }
}
