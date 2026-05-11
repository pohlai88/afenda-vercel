import { getTranslations } from "next-intl/server"

import {
  WorkbenchCommandLayer,
  WorkbenchSubLayout,
} from "#components/workbench"
import { ensureAppLocale } from "#lib/i18n/locales.shared"
import { requireOrgSession } from "#lib/tenant"
import { getOrganizationNameById } from "#lib/org-slug.server"
import {
  buildHrmRailSlots,
  organizationHrmPath,
  organizationHrmRootPath,
} from "#features/hrm"

export const dynamic = "force-dynamic"

export default async function OrgDashboardHrmLayout({
  children,
  params,
}: LayoutProps<"/[locale]/o/[orgSlug]/dashboard/hrm">) {
  const { locale: localeRaw, orgSlug } = await params
  ensureAppLocale(localeRaw)

  const orgSession = await requireOrgSession()

  const [orgName, tShell, tNav] = await Promise.all([
    getOrganizationNameById(orgSession.organizationId),
    getTranslations("Dashboard.Hrm.shell"),
    getTranslations("Dashboard.Hrm.nav"),
  ])

  const navLabels: Record<string, string> = {
    overview: tShell("overviewLink"),
    employees: tNav("employees"),
    leave: tNav("leave"),
    attendance: tNav("attendance"),
    payroll: tNav("payroll"),
    compliance: tNav("compliance"),
    documents: tNav("documents"),
    policies: tNav("policies"),
    snapshot: tNav("snapshot"),
  }

  const railSlots = buildHrmRailSlots({
    orgSlug,
    orgName: orgName ?? orgSlug,
    navLabels,
  })

  const ariaLabel = tShell("capabilityNavAria")

  return (
    <WorkbenchSubLayout
      rail={{
        slots: railSlots,
        labels: {
          ariaLabel,
          collapseLabel: "Collapse HRM rail",
          expandLabel: "Expand HRM rail",
        },
        storageKey: "afenda.hrm.rail",
      }}
      commandLayer={
        <WorkbenchCommandLayer
          title={tShell("title")}
          description={tShell("description")}
          sections={[
            {
              heading: ariaLabel,
              items: [
                {
                  label: tShell("overviewLink"),
                  href: organizationHrmRootPath(orgSlug) as string,
                },
                {
                  label: tNav("employees"),
                  href: organizationHrmPath(orgSlug, "employees") as string,
                },
                {
                  label: tNav("leave"),
                  href: organizationHrmPath(orgSlug, "leave") as string,
                },
                {
                  label: tNav("attendance"),
                  href: organizationHrmPath(orgSlug, "attendance") as string,
                },
                {
                  label: tNav("payroll"),
                  href: organizationHrmPath(orgSlug, "payroll") as string,
                },
                {
                  label: tNav("compliance"),
                  href: organizationHrmPath(orgSlug, "compliance") as string,
                },
                {
                  label: tNav("documents"),
                  href: organizationHrmPath(orgSlug, "documents") as string,
                },
                {
                  label: tNav("policies"),
                  href: organizationHrmPath(orgSlug, "policies") as string,
                },
                {
                  label: tNav("snapshot"),
                  href: organizationHrmPath(orgSlug, "snapshot") as string,
                },
              ],
            },
          ]}
        />
      }
    >
      {children}
    </WorkbenchSubLayout>
  )
}
