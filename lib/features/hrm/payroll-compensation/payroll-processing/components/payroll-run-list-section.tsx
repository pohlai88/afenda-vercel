import { getTranslations } from "next-intl/server"

import { GovernedPatternCListSection } from "#features/governed-surface"

import { buildPayrollRunListSurfaceConfiguration } from "../data/payroll-run-list-surface.server"
import type { PayrollConsoleRun } from "../data/payroll-console-view.shared"

type PayrollRunListSectionProps = {
  runs: readonly PayrollConsoleRun[]
}

export async function PayrollRunListSection({
  runs,
}: PayrollRunListSectionProps) {
  const t = await getTranslations("Dashboard.Hrm.payroll")

  const listConfiguration = buildPayrollRunListSurfaceConfiguration(runs, {
    empty: t("noRuns"),
    colEmployee: t("colEmployee"),
    colState: t("colState"),
    colGrossPay: t("colGrossPay"),
    colNetPay: t("colNetPay"),
    colEmployerCost: t("colEmployerCost"),
    stateLabelFor: (state) => state,
    issuesLabel: (count) => t("hasIssues", { count }),
  })

  return (
    <GovernedPatternCListSection
      layout="embedded"
      title=""
      listConfiguration={listConfiguration}
      surfaceKey="hrm:payroll:runs"
      resolveConfiguredPermission={false}
    />
  )
}
