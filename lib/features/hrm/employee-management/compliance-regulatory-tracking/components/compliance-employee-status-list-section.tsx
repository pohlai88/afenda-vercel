import { getTranslations } from "next-intl/server"

import { GovernedPatternCListSection } from "#features/governed-surface"

import { buildComplianceEmployeeStatusListSurfaceConfiguration } from "../data/compliance-list-surface.server"
import type { ComplianceDashboardRow } from "../data/compliance-dashboard.shared"

type ComplianceEmployeeStatusListSectionProps = {
  rows: readonly ComplianceDashboardRow[]
}

export async function ComplianceEmployeeStatusListSection({
  rows,
}: ComplianceEmployeeStatusListSectionProps) {
  const t = await getTranslations("Dashboard.Hrm.compliance.employeeStatus")

  const listConfiguration =
    buildComplianceEmployeeStatusListSurfaceConfiguration(rows, {
      empty: t("empty"),
      colEmployee: t("colEmployee"),
      colStatus: t("colStatus"),
      colOpen: t("colOpen"),
      colScope: t("colScope"),
      colSignals: t("colSignals"),
    })

  return (
    <GovernedPatternCListSection
      layout="embedded"
      title=""
      listConfiguration={listConfiguration}
      surfaceKey="hrm:compliance:employee-status"
    />
  )
}
