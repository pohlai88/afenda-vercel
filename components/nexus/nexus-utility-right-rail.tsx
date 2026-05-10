"use client"

import type { UserOrgSummary } from "#features/org-admin/client"

import { NexusControlMenu } from "./nexus-control-menu"
import { NexusUtilityConnectivityStatus } from "./nexus-utility-connectivity-status"
import { NexusUtilityConsoleLink } from "./nexus-utility-console-link"
import { NexusUtilityLayoutDensity } from "./nexus-utility-layout-density"
import { NexusUtilityNetworkDiagnosis } from "./nexus-utility-network-diagnosis"
import { NexusUtilityFeedback } from "./nexus-utility-feedback"
import { NexusUtilityIntegrationsLink } from "./nexus-utility-integrations-link"
import { NexusUtilityNotifications } from "./nexus-utility-notifications"
import { NexusUtilityQuickCreate } from "./nexus-utility-quick-create"
import {
  NexusUtilityMessengerPlaceholder,
  NexusUtilityScreenshotPlaceholder,
  NexusUtilityUploadPlaceholder,
} from "./nexus-utility-right-placeholders"
import { NexusUtilityHelpLink } from "./nexus-utility-help-link"
import { NexusUtilityInsightLink } from "./nexus-utility-insight-link"
import { NexusUtilityLocaleMenu } from "./nexus-utility-locale-menu"
import { NexusUtilityOrgSettingsLink } from "./nexus-utility-org-settings-link"
import { NexusUtilitySearchMobile } from "./nexus-utility-search-mobile"
import { NexusUtilityShortcuts } from "./nexus-utility-shortcuts"
import { NexusUtilityStorage } from "./nexus-utility-storage"
import { NexusUtilityThemeMenu } from "./nexus-utility-theme-menu"
import { useNexusUtilityWidgetUi } from "./nexus-utility-widget-preferences"
import type { OperationalPressureItem } from "./nexus.types"

type NexusUtilityRightRailProps = {
  orgSlug: string
  orgName: string
  orgId: string
  userEmail: string
  userOrgs: UserOrgSummary[]
  showOrgAdminSettings: boolean
  pressureItems: OperationalPressureItem[]
}

/** Personal / identity rail — operational shortcuts + customisable utilities before the control menu. */
export function NexusUtilityRightRail({
  orgSlug,
  orgName,
  orgId,
  userEmail,
  userOrgs,
  showOrgAdminSettings,
  pressureItems,
}: NexusUtilityRightRailProps) {
  const { isWidgetVisible } = useNexusUtilityWidgetUi()
  const multiOrg = userOrgs.length > 1

  return (
    <div className="flex min-w-0 items-center justify-end gap-1.5">
      {/* ── Operational shortcuts (moved from left rail) ── */}
      {multiOrg && isWidgetVisible("right.console") ? (
        <NexusUtilityConsoleLink />
      ) : null}
      {isWidgetVisible("right.quickCreate") ? (
        <NexusUtilityQuickCreate />
      ) : null}
      {isWidgetVisible("right.notifications") ? (
        <NexusUtilityNotifications
          orgSlug={orgSlug}
          items={pressureItems}
        />
      ) : null}
      {isWidgetVisible("right.connectivity") ? (
        <NexusUtilityConnectivityStatus />
      ) : null}
      {isWidgetVisible("right.diagnosis") ? (
        <NexusUtilityNetworkDiagnosis />
      ) : null}

      {/* ── Personal utilities ── */}
      {isWidgetVisible("right.searchMobile") ? (
        <NexusUtilitySearchMobile />
      ) : null}
      {isWidgetVisible("right.shortcuts") ? <NexusUtilityShortcuts /> : null}
      {isWidgetVisible("right.help") ? <NexusUtilityHelpLink /> : null}
      {isWidgetVisible("right.theme") ? <NexusUtilityThemeMenu /> : null}
      {isWidgetVisible("right.density") ? <NexusUtilityLayoutDensity /> : null}
      {isWidgetVisible("right.locale") ? <NexusUtilityLocaleMenu /> : null}
      {isWidgetVisible("right.messenger") ? (
        <NexusUtilityMessengerPlaceholder />
      ) : null}
      {isWidgetVisible("right.feedback") ? <NexusUtilityFeedback /> : null}
      {isWidgetVisible("right.screenshot") ? (
        <NexusUtilityScreenshotPlaceholder />
      ) : null}
      {isWidgetVisible("right.upload") ? (
        <NexusUtilityUploadPlaceholder />
      ) : null}
      {isWidgetVisible("right.storage") ? <NexusUtilityStorage /> : null}
      {isWidgetVisible("right.insight") ? (
        <NexusUtilityInsightLink orgSlug={orgSlug} />
      ) : null}
      {showOrgAdminSettings && isWidgetVisible("right.integrations") ? (
        <NexusUtilityIntegrationsLink orgSlug={orgSlug} />
      ) : null}
      {showOrgAdminSettings && isWidgetVisible("right.settings") ? (
        <NexusUtilityOrgSettingsLink orgSlug={orgSlug} />
      ) : null}

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
