import { getTranslations } from "next-intl/server"

import { GovernedPatternCListSection } from "#features/governed-surface"

import type { PayrollPeriodTraceability } from "../data/payroll-engine.server"
import {
  buildPayrollTraceabilityListSurfaceConfiguration,
  payrollTraceabilityListRows,
} from "../data/payroll-traceability-list-surface.server"

type PayrollTraceabilityListSectionProps = {
  traceability: PayrollPeriodTraceability
}

export async function PayrollTraceabilityListSection({
  traceability,
}: PayrollTraceabilityListSectionProps) {
  const t = await getTranslations("Dashboard.Hrm.payroll")

  const rows = payrollTraceabilityListRows(traceability, {
    q1: t("trace.q1"),
    q2: t("trace.q2"),
    q3: t("trace.q3"),
    q4: t("trace.q4"),
    q5: t("trace.q5"),
    q6: t("trace.q6"),
    q7: t("trace.q7"),
    q8: t("trace.q8"),
    complete: t("trace.complete"),
    missing: t("trace.missing"),
    pending: t("trace.pending"),
    notPinned: t("trace.notPinned"),
  })

  const listConfiguration = buildPayrollTraceabilityListSurfaceConfiguration({
    empty: t("trace.empty"),
    colQuestion: t("trace.colQuestion"),
    colValue: t("trace.colValue"),
    colStatus: t("trace.colStatus"),
    rows,
  })

  return (
    <GovernedPatternCListSection
      layout="embedded"
      title=""
      listConfiguration={listConfiguration}
      surfaceKey="hrm:payroll:traceability"
      resolveConfiguredPermission={false}
    />
  )
}
