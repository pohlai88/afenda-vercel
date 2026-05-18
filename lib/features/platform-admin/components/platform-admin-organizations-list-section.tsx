import { getFormatter, getTranslations } from "next-intl/server"

import {
  GovernedPatternCListSection,
  isListSurfaceTrailingActionRenderable,
} from "#features/governed-surface"
import { GovernedTrailingActionSlot } from "#features/governed-surface/client"
import { Link } from "#i18n/navigation"
import {
  organizationAdminPath,
  organizationAppsPath,
} from "#lib/org-apps-module-paths"

import { buildPlatformAdminOrganizationsListSurfaceConfiguration } from "../data/platform-admin-organizations-list-surface.server"
import type { PlatformAdminOrganizationSummary } from "../types"

type PlatformAdminOrganizationsListSectionProps = {
  organizations: readonly PlatformAdminOrganizationSummary[]
}

export async function PlatformAdminOrganizationsListSection({
  organizations,
}: PlatformAdminOrganizationsListSectionProps) {
  const [t, format] = await Promise.all([
    getTranslations("PlatformAdmin.organizations"),
    getFormatter(),
  ])

  const listConfiguration =
    buildPlatformAdminOrganizationsListSurfaceConfiguration(organizations, {
      empty: t("empty"),
      colName: t("colName"),
      colSlug: t("colSlug"),
      colMembers: t("colMembers"),
      colCreated: t("colCreated"),
      formatCreatedAt: (date) => format.dateTime(date, "short"),
    })

  const orgById = new Map(organizations.map((org) => [org.id, org]))

  return (
    <GovernedPatternCListSection
      layout="embedded"
      title=""
      listConfiguration={listConfiguration}
      surfaceKey="platform-admin:organizations"
      resolveConfiguredPermission={false}
      trailingColumn={{
        header: t("colLinks"),
        render: (surfaceRow) => {
          const organization = orgById.get(surfaceRow.id)
          const trailingAction = surfaceRow.trailingAction
          if (
            !organization ||
            !isListSurfaceTrailingActionRenderable(trailingAction)
          ) {
            return null
          }
          return (
            <GovernedTrailingActionSlot trailingAction={trailingAction}>
              <div className="flex flex-wrap items-center gap-3">
                <Link
                  href={organizationAppsPath(organization.slug, "home")}
                  className="text-xs font-medium text-primary underline-offset-4 hover:underline"
                >
                  {t("openDashboard")}
                </Link>
                <Link
                  href={organizationAdminPath(organization.slug, "overview")}
                  className="text-xs font-medium text-primary underline-offset-4 hover:underline"
                >
                  {t("openAdmin")}
                </Link>
              </div>
            </GovernedTrailingActionSlot>
          )
        },
      }}
    />
  )
}
