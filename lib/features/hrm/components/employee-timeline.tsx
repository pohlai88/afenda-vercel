import { getFormatter, getTranslations } from "next-intl/server"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#components/ui/card"

import {
  buildEmployeeTimelineMetadataView,
  type EmployeeTimelineFacetLabelKey,
} from "../data/employee-timeline-metadata.shared"
import type { EmployeeIamAuditTimelineRow } from "../types"

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

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="text-base">{t("timelineTitle")}</CardTitle>
        <CardDescription>{t("timelineDescription")}</CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("timelineEmpty")}</p>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border">
            {rows.map((row) => {
              const metaView = buildEmployeeTimelineMetadataView(row.metadata)
              const when = format.dateTime(row.createdAt, {
                dateStyle: "medium",
                timeStyle: "short",
              })
              const actor =
                row.actorEmail?.trim() ||
                (row.actorUserId ? shortId(row.actorUserId) : null) ||
                t("timelineActorUnknown")
              const resourceBits = [row.resourceType, shortId(row.resourceId)]
                .filter(Boolean)
                .join(" · ")

              return (
                <li key={row.id} className="flex flex-col gap-2 px-3 py-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-sm font-medium text-foreground">
                      {resolveTimelineActionLabel(row.action, t)}
                    </p>
                    <time
                      className="shrink-0 text-xs text-muted-foreground tabular-nums"
                      dateTime={row.createdAt.toISOString()}
                    >
                      {when}
                    </time>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t("timelineActorLabel")}: {actor}
                  </p>
                  {resourceBits ? (
                    <p className="font-mono text-[11px] text-muted-foreground">
                      {t("timelineResourceLabel")}: {resourceBits}
                    </p>
                  ) : null}
                  {metaView.narrative ? (
                    <p className="text-sm leading-snug text-foreground">
                      {metaView.narrative}
                    </p>
                  ) : null}
                  {metaView.facets.length > 0 ? (
                    <dl className="grid gap-1 text-xs sm:grid-cols-2">
                      {metaView.facets.map((f) => (
                        <div
                          key={`${row.id}-${f.labelKey}`}
                          className="min-w-0"
                        >
                          <dt className="text-muted-foreground">
                            {t(f.labelKey)}
                          </dt>
                          <dd className="font-medium wrap-break-word">
                            {formatFacetValue(f.labelKey, f.value, t)}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  ) : null}
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
