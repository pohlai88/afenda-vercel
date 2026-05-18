import type { ReactNode } from "react"
import type { Route } from "next"
import { getTranslations } from "next-intl/server"

import { AppSubLayout } from "#app-shell"
import {
  AppShellCommandPalette,
  AppShellPrimaryLeftRailFooter,
} from "#app-shell/client"
import type { AppLocale } from "#lib/i18n/locales.shared"
import type { RouteEnvelope } from "#lib/erp/route-envelope.shared"
import { platformPath } from "#features/platform-admin"
import {
  buildPlatformAdminRailSlots,
  getPlatformAdminRailPressureCounts,
} from "#features/platform-admin/server"

export type PlatformDeferredShellProps = {
  children: ReactNode
  locale: AppLocale
}

/**
 * Tier B platform console chrome — rail pressure and command palette.
 */
export async function PlatformDeferredShell({
  children,
  locale,
}: PlatformDeferredShellProps) {
  const [t, railPressure] = await Promise.all([
    getTranslations("PlatformAdmin"),
    getPlatformAdminRailPressureCounts(),
  ])

  const railSlots = buildPlatformAdminRailSlots({
    pressure: railPressure,
    pathForSegment: (segment) => platformPath(segment),
  })

  const envelope: RouteEnvelope = {
    surface: "platform",
    locale,
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
                sidebarControl: t("rail.footer.sidebarMode"),
                expanded: t("rail.footer.expanded"),
                expandedHelp: t("rail.footer.expandedHelp"),
                collapsed: t("rail.footer.collapsed"),
                collapsedHelp: t("rail.footer.collapsedHelp"),
                hover: t("rail.footer.expandOnHover"),
                hoverHelp: t("rail.footer.expandOnHoverHelp"),
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
        storageKey: "afenda.platform.rail",
      }}
      command={
        <AppShellCommandPalette
          dialogTitle={t("title")}
          dialogDescription={t("description")}
          sections={[
            {
              heading: t("nav.aria"),
              items: [
                {
                  id: "platform-overview",
                  label: t("nav.overview"),
                  href: platformPath() as Route,
                },
                {
                  id: "platform-users",
                  label: t("nav.users"),
                  href: platformPath("users") as Route,
                },
                {
                  id: "platform-organizations",
                  label: t("nav.organizations"),
                  href: platformPath("organizations") as Route,
                },
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
