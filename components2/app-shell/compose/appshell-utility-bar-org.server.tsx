import "server-only"

import type { ReactNode } from "react"
import type { Route } from "next"
import { getTranslations } from "next-intl/server"

import { listUserOrganizationsForSwitcher } from "#features/org-admin/server"
import {
  listOrgCapabilityPolicy,
  listUserCapabilityPreferences,
  resolveCapabilitiesForViewer,
} from "#features/marketplace/server"
import {
  OrgCommandLayer,
  buildQuickCreateMenu,
  toUtilityBarCapabilityRows,
  toUtilityBarRailSnapshot,
} from "#features/nexus/server"
import { resolveOperationalContext } from "#features/operational-scope"
import {
  organizationIamProfilePath,
  organizationAdminPath,
  organizationAppsPath,
} from "#lib/org-apps-module-paths"
import {
  APP_LOCALES,
  ensureAppLocale,
  toLocalePath,
} from "#lib/i18n/locales.shared"
import type { RouteEnvelope } from "#lib/erp/route-envelope.shared"

import type { AppShellUtilityBarSlots } from "../appshell-props.shared"
import { AppShellUtilityBarCommandSearchTrigger } from "../top-utils-bar/appshell-utility-bar-command.client"
import { AppShellUtilityBarOrgLeft } from "../top-utils-bar/appshell-utility-bar-org-left.client"
import { AppShellUtilityBarRight } from "../top-utils-bar/appshell-utility-bar-right.client"

export type BuildAppShellOrgUtilityBarSlotsInput = {
  locale: RouteEnvelope["locale"]
  orgSlug: string
  orgName: string
  orgId: string
  userId: string
  userEmail: string
}

export type AppShellOrgChrome = {
  utilityBar: AppShellUtilityBarSlots
  command: ReactNode
}

export async function buildAppShellOrgChrome({
  locale,
  orgSlug,
  orgName,
  orgId,
  userId,
  userEmail,
}: BuildAppShellOrgUtilityBarSlotsInput): Promise<AppShellOrgChrome> {
  const appLocale = ensureAppLocale(locale)
  const [
    userOrgs,
    orgPolicy,
    userPreferences,
    operationalContext,
    quickCreateMenu,
    tShell,
  ] = await Promise.all([
    listUserOrganizationsForSwitcher(userId),
    listOrgCapabilityPolicy(orgId),
    listUserCapabilityPreferences({ organizationId: orgId, userId }),
    resolveOperationalContext(orgId, userId),
    buildQuickCreateMenu({ orgSlug, orgId, userId }),
    getTranslations("Dashboard.shell"),
  ])

  const currentOrg = userOrgs.find((o) => o.id === orgId)
  const displayOrgName = currentOrg?.name?.trim() || orgName
  const showOrgAdminSettings =
    currentOrg?.role === "admin" || currentOrg?.role === "owner"

  const resolved = resolveCapabilitiesForViewer({
    viewer: {
      isAdmin: showOrgAdminSettings,
      isMobile: false,
      multiOrg: userOrgs.length > 1,
      multiLocale: APP_LOCALES.length > 1,
    },
    orgPolicy,
    userPreferences,
  })

  const railSnapshot = toUtilityBarRailSnapshot(resolved)
  const capabilityRows = toUtilityBarCapabilityRows(resolved)

  const accountHrefs = {
    account: organizationIamProfilePath(orgSlug) as Route,
    identity: organizationIamProfilePath(orgSlug, "identity") as Route,
    security: organizationIamProfilePath(orgSlug, "security") as Route,
  }

  return {
    command: (
      <OrgCommandLayer
        orgSlug={orgSlug}
        currentOrgId={orgId}
        userOrgs={userOrgs}
        showOrgAdmin={showOrgAdminSettings}
      />
    ),
    utilityBar: {
      left: (
        <AppShellUtilityBarOrgLeft
          orgSlug={orgSlug}
          orgName={displayOrgName}
          orgId={orgId}
          userOrgs={userOrgs}
          showOrgLoadingBay={userOrgs.length > 1}
          operationalContext={operationalContext}
        />
      ),
      center: (
        <AppShellUtilityBarCommandSearchTrigger
          placeholder={tShell("utilityBar.search")}
          triggerAriaLabel={tShell("utilityBar.search")}
          triggerTooltip={tShell("utilityBar.searchTooltip")}
        />
      ),
      right: (
        <AppShellUtilityBarRight
          orgSlug={orgSlug}
          workspaceBlobOrganizationId={orgId}
          quickCreateMenu={quickCreateMenu}
          railSnapshot={railSnapshot}
          capabilityRows={capabilityRows}
          notificationsCanManage={showOrgAdminSettings}
          showOrgAdminIntegrations={showOrgAdminSettings}
          integrationsHref={
            organizationAdminPath(orgSlug, "integrations") as Route
          }
          hrefs={{
            insight: organizationAppsPath(orgSlug, "lynx") as Route,
            help: toLocalePath(appLocale, "/ask-docs") as Route,
            settings: (showOrgAdminSettings
              ? organizationAdminPath(orgSlug, "settings")
              : organizationAppsPath(orgSlug, "home")) as Route,
          }}
          account={{
            userEmail,
            hrefs: accountHrefs,
            workspaceHomeHref: organizationAppsPath(orgSlug, "home"),
          }}
        />
      ),
    },
  }
}

/** @deprecated Use {@link buildAppShellOrgChrome} — returns utility bar slots only. */
export async function buildAppShellOrgUtilityBarSlots(
  input: BuildAppShellOrgUtilityBarSlotsInput
): Promise<AppShellUtilityBarSlots> {
  const chrome = await buildAppShellOrgChrome(input)
  return chrome.utilityBar
}
