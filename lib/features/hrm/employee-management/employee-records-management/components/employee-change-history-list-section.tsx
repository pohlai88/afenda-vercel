import { getFormatter, getTranslations } from "next-intl/server"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#components2/ui/card"
import { GovernedPatternCListSection } from "#features/governed-surface"

import { buildEmployeeChangeHistoryListSurfaceConfiguration } from "../data/employee-change-history-list-surface.server"
import type { EmployeeChangeHistoryRow } from "../data/employee-change-history.queries.server"

function serializeChangeValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "—"
  }
  if (typeof value === "string") {
    return value.length > 120 ? `${value.slice(0, 117)}…` : value
  }
  try {
    const serialized = JSON.stringify(value)
    return serialized.length > 120 ? `${serialized.slice(0, 117)}…` : serialized
  } catch {
    return String(value)
  }
}

type EmployeeChangeHistoryListSectionProps = {
  rows: readonly EmployeeChangeHistoryRow[]
}

export async function EmployeeChangeHistoryListSection({
  rows,
}: EmployeeChangeHistoryListSectionProps) {
  const [t, format] = await Promise.all([
    getTranslations("Dashboard.Hrm.workforce"),
    getFormatter(),
  ])

  const listConfiguration = buildEmployeeChangeHistoryListSurfaceConfiguration(
    rows,
    {
      empty: t("changeHistoryEmpty"),
      colField: t("changeHistoryColField"),
      colOld: t("changeHistoryColOld"),
      colNew: t("changeHistoryColNew"),
      colWhen: t("changeHistoryColWhen"),
      formatValue: serializeChangeValue,
      formatWhen: (value) =>
        format.dateTime(value, { dateStyle: "medium", timeStyle: "short" }),
    }
  )

  return (
    <Card id="history" size="sm">
      <CardHeader>
        <CardTitle className="text-base">{t("changeHistoryTitle")}</CardTitle>
        <CardDescription>{t("changeHistoryDescription")}</CardDescription>
      </CardHeader>
      <CardContent>
        <GovernedPatternCListSection
          layout="embedded"
          title=""
          listConfiguration={listConfiguration}
          surfaceKey="hrm:employee:change-history"
        />
      </CardContent>
    </Card>
  )
}
