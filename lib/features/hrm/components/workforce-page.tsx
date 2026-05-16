import { getTranslations } from "next-intl/server"

import { GovernedComponentRenderer } from "#components2/metadata"
import { requireOrgSession } from "#lib/tenant"

import { listEmployeesForOrganization } from "../data/employee.queries.server"
import { buildWorkforceListSurfaceConfiguration } from "../data/workforce-list-surface.server"

import { AddEmployeeDialog } from "./add-employee-dialog"

type WorkforcePageProps = {
  orgSlug: string
}

export async function WorkforcePage({ orgSlug }: WorkforcePageProps) {
  const { organizationId } = await requireOrgSession()
  const [rows, t] = await Promise.all([
    listEmployeesForOrganization(organizationId),
    getTranslations("Dashboard.Hrm.workforce"),
  ])

  const listConfiguration = buildWorkforceListSurfaceConfiguration(
    rows,
    orgSlug,
    {
      pageTitle: t("pageTitle"),
      pageDescription: t("pageDescription"),
      empty: t("empty"),
      colNumber: t("colNumber"),
      colName: t("colName"),
      colEmail: t("colEmail"),
      colStatus: t("colStatus"),
      statusActive: t("statusActive"),
      statusArchived: t("statusArchived"),
    }
  )

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-end">
        <AddEmployeeDialog orgSlug={orgSlug} />
      </div>
      <GovernedComponentRenderer
        component={{
          type: "governed:list-surface",
          serverType: "governed:list-surface",
          configuration: listConfiguration,
        }}
      />
    </div>
  )
}
