import { getFormatter, getTranslations } from "next-intl/server"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#components2/ui/card"
import { GovernedPatternCListSection } from "#features/governed-surface"

import type { EmployeeTimelineFacetLabelKey } from "../data/employee-timeline-metadata.shared"
import { buildEmployeeTimelineListSurfaceConfiguration } from "../data/employee-timeline-list-surface.server"
import type { EmployeeIamAuditTimelineRow } from "../../../types"

function resolveTimelineActionLabel(
  action: string,
  t: Awaited<ReturnType<typeof getTranslations>>
): string {
  switch (action) {
    case "erp.hrm.employee.create":
      return t("timelineActionEmployeeCreate")
    case "erp.hrm.employee.update":
      return t("timelineActionEmployeeUpdate")
    case "erp.hrm.employee.archive":
      return t("timelineActionEmployeeArchive")
    case "erp.hrm.contract.create":
      return t("timelineActionContractCreate")
    case "erp.hrm.contract.activate":
      return t("timelineActionContractActivate")
    case "erp.hrm.contract.terminate":
      return t("timelineActionContractTerminate")
    case "erp.hrm.payroll_profile.upsert":
      return t("timelineActionPayrollUpsert")
    case "erp.hrm.document.attach":
      return t("timelineActionDocumentAttach")
    default:
      return action
  }
}

function formatFacetValue(
  labelKey: EmployeeTimelineFacetLabelKey,
  value: string,
  t: Awaited<ReturnType<typeof getTranslations>>
): string {
  if (labelKey.startsWith("timelineFacetHas")) {
    if (value === "true") return t("timelineYes")
    if (value === "false") return t("timelineNo")
  }
  return value
}

function shortId(id: string | null): string | null {
  if (!id) return null
  if (id.length <= 12) return id
  return `${id.slice(0, 8)}…`
}

type EmployeeTimelineProps = {
  rows: EmployeeIamAuditTimelineRow[]
}

export async function EmployeeTimeline({ rows }: EmployeeTimelineProps) {
  const [t, format] = await Promise.all([
    getTranslations("Dashboard.Hrm.workforce"),
    getFormatter(),
  ])

  const listConfiguration = buildEmployeeTimelineListSurfaceConfiguration(
    rows,
    {
      empty: t("timelineEmpty"),
      colAction: t("timelineColEvent"),
      colWhen: t("timelineColWhen"),
      colActor: t("timelineActorLabel"),
      colDetails: t("timelineColDetails"),
      actionLabelFor: (action) => resolveTimelineActionLabel(action, t),
      formatWhen: (value) =>
        format.dateTime(value, { dateStyle: "medium", timeStyle: "short" }),
      actorLabelFor: (row) =>
        row.actorEmail?.trim() ||
        (row.actorUserId ? shortId(row.actorUserId) : null) ||
        t("timelineActorUnknown"),
      facetLabelFor: (labelKey) => t(labelKey),
      formatFacetValue: (labelKey, value) =>
        formatFacetValue(labelKey, value, t),
      actorUnknown: t("timelineActorUnknown"),
    }
  )

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="text-base">{t("timelineTitle")}</CardTitle>
        <CardDescription>{t("timelineDescription")}</CardDescription>
      </CardHeader>
      <CardContent>
        <GovernedPatternCListSection
          layout="embedded"
          title=""
          listConfiguration={listConfiguration}
          surfaceKey="hrm:employee:timeline"
        />
      </CardContent>
    </Card>
  )
}
