import "server-only"

import type { Route } from "next"
import { getTranslations } from "next-intl/server"

import { listUserOrganizationsForSwitcher } from "#features/org-admin/server"
import {
  listOrgCapabilityPolicy,
  listUserCapabilityPreferences,
  resolveCapabilitiesForViewer,
} from "#features/marketplace/server"
import { resolveOperationalContext } from "#features/operational-scope"
import {
  organizationAccountPath,
  organizationAdminPath,
  organizationAppsPath,
} from "#lib/org-apps-module-paths"
import { APP_LOCALES, ensureAppLocale, toLocalePath } from "#lib/i18n/locales.shared"
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

export async function buildAppShellOrgUtilityBarSlots({
  locale,
  orgSlug,
  orgName,
  orgId,
  userId,
  userEmail,
}: BuildAppShellOrgUtilityBarSlotsInput): Promise<AppShellUtilityBarSlots> {
  const appLocale = ensureAppLocale(locale)
  const [userOrgs, orgPolicy, userPreferences, operationalContext, tShell] =
    await Promise.all([
      listUserOrganizationsForSwitcher(userId),
      listOrgCapabilityPolicy(orgId),
      listUserCapabilityPreferences({ organizationId: orgId, userId }),
      resolveOperationalContext(orgId, userId),
      getTranslations("Dashboard.shell"),
    ])

  const currentOrg = userOrgs.find((o) => o.id === orgId)
  const displayOrgName = currentOrg?.name?.trim() || orgName
  const showOrgAdminSettings =
    currentOrg?.role === "admin" || currentOrg?.role === "owner"

  resolveCapabilitiesForViewer({
    viewer: {
      isAdmin: showOrgAdminSettings,
      isMobile: false,
      multiOrg: userOrgs.length > 1,
      multiLocale: APP_LOCALES.length > 1,
    },
    orgPolicy,
    userPreferences,
  })

  const accountHrefs = {
    account: organizationAccountPath(orgSlug) as Route,
    identity: organizationAccountPath(orgSlug, "identity") as Route,
    security: organizationAccountPath(orgSlug, "security") as Route,
  }

  return {
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
  }
}
