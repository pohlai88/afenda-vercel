"use client"

import type { Route } from "next"
import {
  CircleHelp,
  PenLine,
  Search,
  ShieldCheck,
  Sparkles,
  Store,
} from "lucide-react"
import { useTranslations } from "next-intl"

import { useRouteEnvelope } from "#components/route-envelope-context"
import { organizationMarketplacePath } from "#features/marketplace/client"
import {
  organizationAdminPath,
  organizationDashboardPath,
} from "#lib/dashboard-module-paths"

import { useWorkbenchCommand } from "../../workbench-command"
import { WorkbenchControlMenu } from "./workbench-control-menu"
import { WorkbenchUtilityConnectivityStatus } from "./workbench-utility-connectivity-status"
import { WorkbenchUtilityFeedback } from "./workbench-utility-feedback"
import { WorkbenchUtilityLayoutDensity } from "./workbench-utility-layout-density"
import { WorkbenchUtilityLocaleMenu } from "./workbench-utility-locale-menu"
import { OperationalCoordinationConsole } from "#features/coordination/client"
import { WorkbenchUtilityMessenger } from "./workbench-utility-messenger.client"
import { WorkbenchUtilityNetworkDiagnosis } from "./workbench-utility-network-diagnosis"
import { WorkbenchUtilityNotifications } from "./workbench-utility-notifications"
import { WorkbenchUtilityRoundTooltipButton } from "./workbench-utility-round-tooltip-button"
import { WorkbenchUtilityRoundTooltipLink } from "./workbench-utility-round-tooltip-link"
import { WorkbenchUtilityScreenshot } from "./workbench-utility-screenshot"
import { WorkbenchUtilityShortcuts } from "./workbench-utility-shortcuts"
import { WorkbenchUtilityStorage } from "./workbench-utility-storage"
import { WorkbenchUtilityThemeMenu } from "./workbench-utility-theme-menu"
import { WorkbenchUtilityUpload } from "./workbench-utility-upload"
import type { WorkbenchUtilityRightWidgetId } from "./workbench-utility-widget-ids"

type WorkbenchRightUtilityBarProps = {
  orgSlug: string
  orgName: string
  orgId: string
  userEmail: string
  showOrgAdminSettings: boolean
  visibleRightIds: readonly WorkbenchUtilityRightWidgetId[]
}

function UtilityHelpLink() {
  const t = useTranslations("Dashboard.shell.utilityBar")

  return (
    <WorkbenchUtilityRoundTooltipLink
      href={"/" as Route}
      ariaLabel={t("help")}
      tooltip={t("helpTooltip")}
    >
      <CircleHelp
        className="size-[15px] shrink-0"
        aria-hidden
        strokeWidth={2}
      />
    </WorkbenchUtilityRoundTooltipLink>
  )
}

function UtilityInsightLink({ orgSlug }: { orgSlug: string }) {
  const t = useTranslations("Dashboard.shell.utilityBar")

  return (
    <WorkbenchUtilityRoundTooltipLink
      href={organizationDashboardPath(orgSlug, "lynx")}
      ariaLabel={t("insight")}
      tooltip={t("insightTooltip")}
    >
      <Sparkles className="size-[15px] shrink-0" aria-hidden strokeWidth={2} />
    </WorkbenchUtilityRoundTooltipLink>
  )
}

function UtilityMarketplaceLink() {
  const tBar = useTranslations("Dashboard.shell.utilityBar")
  const tShell = useTranslations("Marketplace.overview")
  const envelope = useRouteEnvelope()
  const href: Route = envelope?.orgSlug
    ? organizationMarketplacePath(envelope.orgSlug)
    : ("/marketplace" as Route)

  return (
    <WorkbenchUtilityRoundTooltipLink
      href={href}
      ariaLabel={tShell("title")}
      tooltip={tBar("marketplaceTooltip")}
    >
      <Store className="size-[15px] shrink-0" aria-hidden strokeWidth={2} />
    </WorkbenchUtilityRoundTooltipLink>
  )
}

function UtilityOrgSettingsLink({ orgSlug }: { orgSlug: string }) {
  const tBar = useTranslations("Dashboard.shell.utilityBar")

  return (
    <WorkbenchUtilityRoundTooltipLink
      href={organizationAdminPath(orgSlug, "settings")}
      ariaLabel={tBar("settingsAriaLabel")}
      tooltip={tBar("settingsTooltip")}
    >
      <ShieldCheck
        className="size-[15px] shrink-0"
        aria-hidden
        strokeWidth={2}
      />
    </WorkbenchUtilityRoundTooltipLink>
  )
}

function UtilityQuickCreate() {
  const t = useTranslations("Dashboard.shell.utilityBar")
  const { openCommand } = useWorkbenchCommand()

  return (
    <WorkbenchUtilityRoundTooltipButton
      ariaLabel={t("quickCreate")}
      tooltip={t("quickCreateTooltip")}
      onClick={openCommand}
    >
      <PenLine className="size-[15px] shrink-0" aria-hidden strokeWidth={2} />
    </WorkbenchUtilityRoundTooltipButton>
  )
}

function UtilitySearchMobile() {
  const t = useTranslations("Dashboard.shell.utilityBar")
  const { openCommand } = useWorkbenchCommand()

  return (
    <WorkbenchUtilityRoundTooltipButton
      ariaLabel={t("search")}
      tooltip={t("searchTooltip")}
      onClick={openCommand}
      className="sm:hidden"
    >
      <Search className="size-[15px] shrink-0" aria-hidden strokeWidth={2} />
    </WorkbenchUtilityRoundTooltipButton>
  )
}

export function WorkbenchRightUtilityBar({
  orgSlug,
  orgName,
  orgId,
  userEmail,
  showOrgAdminSettings,
  visibleRightIds,
}: WorkbenchRightUtilityBarProps) {
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

      <WorkbenchControlMenu
        userEmail={userEmail}
        orgSlug={orgSlug}
        orgName={orgName}
        showOrgAdminLink={showOrgAdminSettings}
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
  id: WorkbenchUtilityRightWidgetId
  orgId: string
  orgSlug: string
  showOrgAdminSettings: boolean
}) {
  switch (id) {
    case "right.marketplace":
      return <UtilityMarketplaceLink />
    // Catalog may still list console; `WorkbenchUtilityBarRow` strips it before render.
    case "right.console":
      return null
    case "right.quickCreate":
      return <UtilityQuickCreate />
    case "right.notifications":
      return <WorkbenchUtilityNotifications canManage={showOrgAdminSettings} />
    case "right.insight":
      return <UtilityInsightLink orgSlug={orgSlug} />
    case "right.connectivity":
      return <WorkbenchUtilityConnectivityStatus />
    case "right.feedback":
      return <WorkbenchUtilityFeedback />
    case "right.messenger":
      return <WorkbenchUtilityMessenger orgId={orgId} />
    case "right.coordination":
      return <OperationalCoordinationConsole orgId={orgId} />
    case "right.shortcuts":
      return <WorkbenchUtilityShortcuts />
    case "right.help":
      return <UtilityHelpLink />
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
        <UtilityOrgSettingsLink orgSlug={orgSlug} />
      ) : null
    case "right.diagnosis":
      return <WorkbenchUtilityNetworkDiagnosis />
    case "right.searchMobile":
      return <UtilitySearchMobile />
  }
}
