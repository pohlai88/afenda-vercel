"use client"

import type { UserOrgSummary } from "#features/org-admin/client"

import { NexusControlMenu } from "./nexus-control-menu"
import { NexusUtilityConnectivityStatus } from "./nexus-utility-connectivity-status"
import { NexusUtilityConsoleLink } from "./nexus-utility-console-link"
import { NexusUtilityLayoutDensity } from "./nexus-utility-layout-density"
import { NexusUtilityMarketplaceLink } from "./nexus-utility-marketplace-link"
import { NexusUtilityMessenger } from "./nexus-utility-messenger"
import { NexusUtilityNetworkDiagnosis } from "./nexus-utility-network-diagnosis"
import { NexusUtilityFeedback } from "./nexus-utility-feedback"
import { NexusUtilityNotifications } from "./nexus-utility-notifications"
import { NexusUtilityQuickCreate } from "./nexus-utility-quick-create"
import { NexusUtilityHelpLink } from "./nexus-utility-help-link"
import { NexusUtilityInsightLink } from "./nexus-utility-insight-link"
import { NexusUtilityLocaleMenu } from "./nexus-utility-locale-menu"
import { NexusUtilityOrgSettingsLink } from "./nexus-utility-org-settings-link"
import { NexusUtilitySearchMobile } from "./nexus-utility-search-mobile"
import { NexusUtilityShortcuts } from "./nexus-utility-shortcuts"
import { NexusUtilityScreenshot } from "./nexus-utility-screenshot"
import { NexusUtilityStorage } from "./nexus-utility-storage"
import { NexusUtilityThemeMenu } from "./nexus-utility-theme-menu"
import { NexusUtilityUpload } from "./nexus-utility-upload"
import { useNexusUtilityWidgetUi } from "./nexus-utility-widget-preferences"
import type { NexusUtilityRightWidgetId } from "./nexus-utility-widget-ids"

type NexusUtilityRightRailProps = {
  orgSlug: string
  orgName: string
  orgId: string
  userEmail: string
  userOrgs: UserOrgSummary[]
  showOrgAdminSettings: boolean
}

/** Personal / identity rail — operational shortcuts + customisable utilities before the control menu. */
export function NexusUtilityRightRail({
  orgSlug,
  orgName,
  orgId,
  userEmail,
  userOrgs,
  showOrgAdminSettings,
}: NexusUtilityRightRailProps) {
  const { visibleRightIds } = useNexusUtilityWidgetUi()

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
      <NexusControlMenu
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
      return showOrgAdminSettings ? (
        <NexusUtilityMarketplaceLink orgSlug={orgSlug} />
      ) : null
    case "right.console":
      return <NexusUtilityConsoleLink />
    case "right.quickCreate":
      return <NexusUtilityQuickCreate />
    case "right.notifications":
      return <NexusUtilityNotifications canManage={showOrgAdminSettings} />
    case "right.insight":
      return <NexusUtilityInsightLink orgSlug={orgSlug} />
    case "right.connectivity":
      return <NexusUtilityConnectivityStatus />
    case "right.feedback":
      return <NexusUtilityFeedback />
    case "right.messenger":
      return <NexusUtilityMessenger orgId={orgId} />
    case "right.shortcuts":
      return <NexusUtilityShortcuts />
    case "right.help":
      return <NexusUtilityHelpLink />
    case "right.theme":
      return <NexusUtilityThemeMenu />
    case "right.density":
      return <NexusUtilityLayoutDensity />
    case "right.locale":
      return <NexusUtilityLocaleMenu />
    case "right.storage":
      return <NexusUtilityStorage />
    case "right.screenshot":
      return <NexusUtilityScreenshot orgId={orgId} />
    case "right.upload":
      return <NexusUtilityUpload orgId={orgId} />
    case "right.settings":
      return showOrgAdminSettings ? (
        <NexusUtilityOrgSettingsLink orgSlug={orgSlug} />
      ) : null
    case "right.diagnosis":
      return <NexusUtilityNetworkDiagnosis />
    case "right.searchMobile":
      return <NexusUtilitySearchMobile />
  }
}
