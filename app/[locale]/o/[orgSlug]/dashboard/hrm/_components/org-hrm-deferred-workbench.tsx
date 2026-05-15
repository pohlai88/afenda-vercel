import type { ReactNode } from "react"
import { getTranslations } from "next-intl/server"

import { AppSubLayout } from "#components/workbench"
import { WorkbenchRailFooter } from "#components/workbench/left-nav-rail"
import type { AppLocale } from "#lib/i18n/locales.shared"
import type { RouteEnvelope } from "#lib/route-envelope.shared"
import { getOrganizationNameById } from "#lib/org-slug.server"
import type { OrgSession } from "#lib/tenant"
import { listEffectiveErpPermissionsForUser } from "#features/erp-rbac/server"
import {
  buildHrmRailSlots,
  HRM_CAPABILITIES,
  resolveLeaveSurfaceAccess,
  type HrmCapability,
  organizationHrmPath,
  organizationHrmRootPath,
} from "#features/hrm"
import { getHrmRailPressureCounts } from "#features/hrm/server"

export type OrgHrmDeferredWorkbenchProps = {
  children: ReactNode
  locale: AppLocale
  orgSlug: string
  orgSession: OrgSession
}

/**
 * Tier B HRM chrome — translations, rail pressure, org display label.
 * Parent layout resolves session + params before Suspense.
 */
export async function OrgHrmDeferredWorkbench({
  children,
  locale,
  orgSlug,
  orgSession,
}: OrgHrmDeferredWorkbenchProps) {
  const [tShell, tNav, railPressure, orgDisplayName, leaveAccess] =
    await Promise.all([
      getTranslations("Dashboard.Hrm.shell"),
      getTranslations("Dashboard.Hrm.nav"),
      getHrmRailPressureCounts(orgSession.organizationId),
      getOrganizationNameById(orgSession.organizationId),
      resolveLeaveSurfaceAccess({
        organizationId: orgSession.organizationId,
        userId: orgSession.userId,
      }),
    ])
  const effectivePermissions = await listEffectiveErpPermissionsForUser({
    organizationId: orgSession.organizationId,
    userId: orgSession.userId,
  })
  const visibleCapabilities: readonly HrmCapability[] = HRM_CAPABILITIES.filter(
    (capability) =>
      effectivePermissions.includes(capability.requiredPermission) ||
      (capability.id === "leave" && leaveAccess.canEnter)
  )

  const orgPrimaryLabel = orgDisplayName ?? orgSlug

  const navLabels: Record<string, string> = {
    overview: tShell("overviewLink"),
    ...Object.fromEntries(
      visibleCapabilities.map((capability) => [
        capability.nav.navKey,
        tNav(capability.nav.navKey),
      ])
    ),
  }

  const railSlots = buildHrmRailSlots({
    orgSlug,
    capabilities: visibleCapabilities,
    navLabels,
    pressure: railPressure,
  })

  const ariaLabel = tShell("capabilityNavAria")
  const envelope: RouteEnvelope = {
    surface: "dashboard",
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
              avatarLabel={orgPrimaryLabel}
              primaryLabel={orgPrimaryLabel}
              secondaryLabel={orgSession.user.email}
              labels={{
                sidebarControl: tShell("rail.footer.sidebarMode"),
                expanded: tShell("rail.footer.expanded"),
                expandedHelp: tShell("rail.footer.expandedHelp"),
                collapsed: tShell("rail.footer.collapsed"),
                collapsedHelp: tShell("rail.footer.collapsedHelp"),
                expandOnHover: tShell("rail.footer.expandOnHover"),
                expandOnHoverHelp: tShell("rail.footer.expandOnHoverHelp"),
                current: tShell("rail.footer.current"),
              }}
            />
          ),
        },
        labels: {
          ariaLabel,
          collapseLabel: tShell("rail.collapseLabel"),
          expandLabel: tShell("rail.expandLabel"),
          navSearchPlaceholder: tShell("rail.navSearchPlaceholder"),
          navSearchAriaLabel: tShell("rail.navSearchAriaLabel"),
          navSearchCollapsedTriggerAriaLabel: tShell(
            "rail.navSearchCollapsedTriggerAriaLabel"
          ),
          navSearchNoMatches: tShell("rail.navSearchNoMatches"),
        },
        storageKey: "afenda.hrm.rail",
      }}
      command={{
        title: tShell("title"),
        description: tShell("description"),
        sections: [
          {
            heading: ariaLabel,
            items: [
              {
                label: tShell("overviewLink"),
                href: organizationHrmRootPath(orgSlug) as string,
              },
              ...visibleCapabilities.map((capability) => ({
                label: tNav(capability.nav.navKey),
                href: organizationHrmPath(
                  orgSlug,
                  capability.nav.primarySegment
                ) as string,
              })),
            ],
          },
        ],
      }}
    >
      {children}
    </AppSubLayout>
  )
}
