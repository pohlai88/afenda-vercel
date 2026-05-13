import type { ReactNode } from "react"
import { getTranslations } from "next-intl/server"

import { AppSubLayout } from "#components/workbench"
import { WorkbenchRailFooter } from "#components/workbench/left-nav-rail"
import type { AppLocale } from "#lib/i18n/locales.shared"
import type { RouteEnvelope } from "#lib/route-envelope.shared"
import type { GlobalAdminSession, OrgSession } from "#lib/tenant"
import {
  buildPlatformAdminRailSlots,
  getPlatformAdminRailPressureCounts,
} from "#features/platform-admin/server"
import { organizationOperatorPath } from "#features/platform-admin"

export type OrgOperatorDeferredWorkbenchProps = {
  children: ReactNode
  locale: AppLocale
  orgSlug: string
  globalAdmin: GlobalAdminSession
  orgSession: OrgSession
}

/**
 * Tier B operator chrome — platform-admin translations and rail pressure.
 */
export async function OrgOperatorDeferredWorkbench({
  children,
  locale,
  orgSlug,
  globalAdmin,
  orgSession,
}: OrgOperatorDeferredWorkbenchProps) {
  const [t, railPressure] = await Promise.all([
    getTranslations("PlatformAdmin"),
    getPlatformAdminRailPressureCounts(),
  ])

  const railSlots = buildPlatformAdminRailSlots({
    pressure: railPressure,
    pathForSegment: (segment) => organizationOperatorPath(orgSlug, segment),
  })

  const operatorPrimaryLabel =
    globalAdmin.user.name?.trim() ||
    globalAdmin.user.email.split("@")[0]?.trim() ||
    globalAdmin.user.email

  const envelope: RouteEnvelope = {
    surface: "operator",
    locale,
    orgSlug,
    orgId: orgSession.organizationId,
  }

  return (
    <AppSubLayout
      envelope={envelope}
      rail={{
        slots: {
          ...railSlots,
          footer: (
            <WorkbenchRailFooter
              avatarLabel={operatorPrimaryLabel}
              primaryLabel={operatorPrimaryLabel}
              secondaryLabel={globalAdmin.user.email}
              labels={{
                sidebarControl: t("rail.footer.sidebarMode"),
                expanded: t("rail.footer.expanded"),
                expandedHelp: t("rail.footer.expandedHelp"),
                collapsed: t("rail.footer.collapsed"),
                collapsedHelp: t("rail.footer.collapsedHelp"),
                expandOnHover: t("rail.footer.expandOnHover"),
                expandOnHoverHelp: t("rail.footer.expandOnHoverHelp"),
                current: t("rail.footer.current"),
              }}
            />
          ),
        },
        labels: {
          ariaLabel: t("nav.aria"),
          collapseLabel: t("rail.collapseLabel"),
          expandLabel: t("rail.expandLabel"),
          navSearchPlaceholder: t("rail.navSearchPlaceholder"),
          navSearchAriaLabel: t("rail.navSearchAriaLabel"),
          navSearchCollapsedTriggerAriaLabel: t(
            "rail.navSearchCollapsedTriggerAriaLabel"
          ),
          navSearchNoMatches: t("rail.navSearchNoMatches"),
        },
        storageKey: "afenda.operator.rail",
      }}
      command={{
        title: t("title"),
        description: t("description"),
        sections: [
          {
            heading: t("nav.aria"),
            items: [
              {
                label: t("nav.overview"),
                href: organizationOperatorPath(orgSlug),
              },
              {
                label: t("nav.users"),
                href: organizationOperatorPath(orgSlug, "users"),
              },
              {
                label: t("nav.organizations"),
                href: organizationOperatorPath(orgSlug, "organizations"),
              },
            ],
          },
        ],
      }}
    >
      {children}
    </AppSubLayout>
  )
}
