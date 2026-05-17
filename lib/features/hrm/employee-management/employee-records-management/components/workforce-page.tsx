import { getTranslations } from "next-intl/server"

import { GovernedComponentRenderer } from "#components2/metadata"
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#components2/ui/card"
import { requireOrgSession } from "#lib/auth"

import { resolveEmployeeRecordCapabilities } from "../data/employee-record-capabilities.server"
import { listEmployeesForOrganization } from "../data/employee.queries.server"
import { buildWorkforceListSurfaceConfiguration } from "../data/workforce-list-surface.server"

import { AddEmployeeDialog } from "./add-employee-dialog"

type WorkforcePageProps = {
  orgSlug: string
}

export async function WorkforcePage({ orgSlug }: WorkforcePageProps) {
  const { organizationId } = await requireOrgSession()
  const [rows, t, capabilities] = await Promise.all([
    listEmployeesForOrganization(organizationId),
    getTranslations("Dashboard.Hrm.workforce"),
    resolveEmployeeRecordCapabilities(),
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
      {!capabilities.canCreate && !capabilities.canUpdate ? (
        <Card size="sm">
          <CardHeader>
            <CardTitle>{t("memberRestrictedTitle")}</CardTitle>
            <CardDescription>{t("memberRestrictedBody")}</CardDescription>
          </CardHeader>
        </Card>
      ) : null}
      {capabilities.canCreate ? (
        <div className="flex justify-end">
          <AddEmployeeDialog orgSlug={orgSlug} />
        </div>
      ) : null}
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
