import { getTranslations } from "next-intl/server"

import { ModulePageHeader } from "#features/governed-surface"
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#components2/ui/card"
import { requireOrgSession } from "#lib/auth"

import { resolveEmployeeRecordCapabilities } from "../data/employee-record-capabilities.server"
import { listEmployeesForOrganization } from "../data/employee.queries.server"

import { AddEmployeeDialog } from "./add-employee-dialog"
import { WorkforceListSection } from "./workforce-list-section"

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

  return (
    <div className="flex flex-col gap-6">
      <ModulePageHeader
        title={t("pageTitle")}
        description={t("pageDescription")}
      />
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
      <WorkforceListSection orgSlug={orgSlug} rows={rows} />
    </div>
  )
}
