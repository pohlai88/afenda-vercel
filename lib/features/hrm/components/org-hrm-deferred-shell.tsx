import type { ReactNode } from "react"
import { getTranslations } from "next-intl/server"

import { AppSubLayout } from "#app-shell"
import {
  AppShellCommandPalette,
  AppShellPrimaryLeftRailFooter,
} from "#app-shell/client"
import type { AppLocale } from "#lib/i18n/locales.shared"
import type { RouteEnvelope } from "#lib/erp/route-envelope.shared"
import type { OrgSession } from "#lib/auth"
import { listEffectiveErpPermissionsForUser } from "#features/erp-rbac/server"
import { buildHrmRailSlots } from "../_internal-cross-cutting/hrm-rail-slots"
import {
  HRM_CAPABILITIES,
  organizationHrmPath,
  organizationHrmRootPath,
  type HrmCapability,
} from "../constants"
import { resolveLeaveSurfaceAccess } from "../time-attendance/leave-attendance-management/data/leave-access.server"
import { getHrmRailPressureCounts } from "../server"

export type OrgHrmDeferredShellProps = {
  children: ReactNode
  locale: AppLocale
  orgSlug: string
  orgSession: OrgSession
}

/**
 * Tier B HRM chrome — translations, rail pressure, org display label.
 * Parent layout resolves session + params before Suspense.
 */
export async function OrgHrmDeferredShell({
  children,
  locale,
  orgSlug,
  orgSession,
}: OrgHrmDeferredShellProps) {
  // All five reads are independent — they only need the already-resolved
  // org session — so they belong in a single Tier B Promise.all. The
  // permissions read was previously sequential after the four-call group;
  // bringing it inside cuts one full async hop off every HRM navigation.
  const [tShell, tNav, railPressure, leaveAccess, effectivePermissions] =
    await Promise.all([
      getTranslations("Dashboard.Hrm.shell"),
      getTranslations("Dashboard.Hrm.nav"),
      getHrmRailPressureCounts(orgSession.organizationId),
      resolveLeaveSurfaceAccess({
        organizationId: orgSession.organizationId,
        userId: orgSession.userId,
      }),
      listEffectiveErpPermissionsForUser({
        organizationId: orgSession.organizationId,
        userId: orgSession.userId,
      }),
    ])
  const visibleCapabilities: readonly HrmCapability[] = HRM_CAPABILITIES.filter(
    (capability) =>
      effectivePermissions.includes(capability.requiredPermission) ||
      (capability.id === "leave" && leaveAccess.canEnter)
  )

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
    surface: "apps",
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
            <AppShellPrimaryLeftRailFooter
              labels={{
                sidebarControl: tShell("rail.footer.sidebarMode"),
                expanded: tShell("rail.footer.expanded"),
                expandedHelp: tShell("rail.footer.expandedHelp"),
                collapsed: tShell("rail.footer.collapsed"),
                collapsedHelp: tShell("rail.footer.collapsedHelp"),
                hover: tShell("rail.footer.expandOnHover"),
                hoverHelp: tShell("rail.footer.expandOnHoverHelp"),
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
      command={
        <AppShellCommandPalette
          dialogTitle={tShell("title")}
          dialogDescription={tShell("description")}
          sections={[
            {
              heading: ariaLabel,
              items: [
                {
                  id: "hrm-overview",
                  label: tShell("overviewLink"),
                  href: organizationHrmRootPath(orgSlug),
                },
                ...visibleCapabilities.map((capability) => ({
                  id: `hrm-${capability.id}`,
                  label: tNav(capability.nav.navKey),
                  href: organizationHrmPath(
                    orgSlug,
                    capability.nav.primarySegment
                  ),
                })),
              ],
            },
          ]}
        />
      }
    >
      {children}
    </AppSubLayout>
  )
}
