import { getTranslations } from "next-intl/server"

import { Badge } from "#components2/ui/badge"

import type { BenefitLifeEventRow } from "../data/benefit-model.shared"
import {
  isBenefitLifeEventType,
  isBenefitLifeEventVerificationStatus,
  type BenefitLifeEventType,
  type BenefitLifeEventVerificationStatus,
} from "../data/benefit-helpers.shared"

import { BenefitLifeEventVerifyActions } from "./benefit-life-event-verify-actions"

type BenefitLifeEventsTableProps = {
  isAdmin: boolean
  rows: readonly BenefitLifeEventRow[]
}

function isoDay(value: Date): string {
  return value.toISOString().slice(0, 10)
}

function statusVariant(
  status: string
): "default" | "secondary" | "success" | "warning" | "destructive" {
  if (status === "verified") return "success"
  if (status === "pending") return "warning"
  if (status === "rejected") return "destructive"
  return "secondary"
}

export async function BenefitLifeEventsTable({
  isAdmin,
  rows,
}: BenefitLifeEventsTableProps) {
  const t = await getTranslations("Dashboard.Hrm.benefits.lifeEventsTable")

  function eventTypeLabel(eventType: BenefitLifeEventType): string {
    switch (eventType) {
      case "marriage":
        return t("eventTypes.marriage")
      case "divorce":
        return t("eventTypes.divorce")
      case "birth_adoption":
        return t("eventTypes.birth_adoption")
      case "death_of_dependent":
        return t("eventTypes.death_of_dependent")
      case "loss_of_coverage":
        return t("eventTypes.loss_of_coverage")
      case "spouse_job_loss":
        return t("eventTypes.spouse_job_loss")
      case "change_in_employment_status":
        return t("eventTypes.change_in_employment_status")
      case "other":
        return t("eventTypes.other")
    }
  }

  function verificationStatusLabel(
    status: BenefitLifeEventVerificationStatus
  ): string {
    switch (status) {
      case "pending":
        return t("verification.pending")
      case "verified":
        return t("verification.verified")
      case "rejected":
        return t("verification.rejected")
    }
  }

  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("empty")}</p>
  }

  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="w-full min-w-[760px] caption-bottom text-sm">
        <thead className="border-b border-border bg-muted/40">
          <tr>
            <th className="px-3 py-2 text-start font-medium">{t("colDate")}</th>
            <th className="px-3 py-2 text-start font-medium">
              {t("colEmployee")}
            </th>
            <th className="px-3 py-2 text-start font-medium">
              {t("colEvent")}
            </th>
            <th className="px-3 py-2 text-start font-medium">
              {t("colStatus")}
            </th>
            {isAdmin ? (
              <th className="px-3 py-2 text-end font-medium">
                {t("colActions")}
              </th>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-border last:border-0">
              <td className="px-3 py-2 align-top text-muted-foreground">
                {isoDay(row.eventDate)}
              </td>
              <td className="px-3 py-2 align-top font-medium">
                {row.employeeLegalName}
              </td>
              <td className="px-3 py-2 align-top">
                <div>
                  {isBenefitLifeEventType(row.eventType)
                    ? eventTypeLabel(row.eventType)
                    : row.eventType}
                </div>
                {row.notes ? (
                  <div className="mt-1 max-w-md text-xs text-muted-foreground">
                    {row.notes}
                  </div>
                ) : null}
              </td>
              <td className="px-3 py-2 align-top">
                <Badge variant={statusVariant(row.verificationStatus)}>
                  {isBenefitLifeEventVerificationStatus(row.verificationStatus)
                    ? verificationStatusLabel(row.verificationStatus)
                    : row.verificationStatus}
                </Badge>
              </td>
              {isAdmin ? (
                <td className="px-3 py-2 text-end align-top">
                  {row.verificationStatus === "pending" ? (
                    <BenefitLifeEventVerifyActions lifeEventId={row.id} />
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
