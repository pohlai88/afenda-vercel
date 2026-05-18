import { getTranslations } from "next-intl/server"

import { GovernedPatternCListSection } from "#features/governed-surface"

import { buildPayrollCloseChecklistListSurfaceConfiguration } from "../data/payroll-close-checklist-list-surface.server"
import type { PayrollCloseChecklistItem } from "../data/payroll-close.shared"

type PayrollCloseChecklistListSectionProps = {
  items: readonly PayrollCloseChecklistItem[]
}

export async function PayrollCloseChecklistListSection({
  items,
}: PayrollCloseChecklistListSectionProps) {
  const t = await getTranslations("Dashboard.Hrm.payroll")

  const statusLabelFor = (status: PayrollCloseChecklistItem["status"]) => {
    if (status === "passed") return t("close.status.passed")
    if (status === "warning") return t("close.status.warning")
    if (status === "blocked") return t("close.status.blocked")
    return t("close.status.pending")
  }

  const listConfiguration = buildPayrollCloseChecklistListSurfaceConfiguration(
    items,
    {
      empty: t("close.checklistEmpty"),
      colItem: t("close.checklistColItem"),
      colStatus: t("close.checklistColStatus"),
      statusLabelFor,
    }
  )

  return (
    <GovernedPatternCListSection
      layout="embedded"
      title=""
      listConfiguration={listConfiguration}
      surfaceKey="hrm:payroll:close-checklist"
      resolveConfiguredPermission={false}
    />
  )
}
