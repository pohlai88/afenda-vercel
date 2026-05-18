import { getTranslations } from "next-intl/server"

import { GovernedPatternCListSection } from "#features/governed-surface"

import { buildBenefitLifeEventsListSurfaceConfiguration } from "../data/benefit-list-surface.server"
import {
  isBenefitLifeEventType,
  isBenefitLifeEventVerificationStatus,
  type BenefitLifeEventType,
  type BenefitLifeEventVerificationStatus,
} from "../data/benefit-helpers.shared"
import type { BenefitLifeEventRow } from "../data/benefit-model.shared"

import { BenefitLifeEventVerifyActions } from "./benefit-life-event-verify-actions"

type BenefitLifeEventsSectionProps = {
  isAdmin: boolean
  rows: readonly BenefitLifeEventRow[]
}

export async function BenefitLifeEventsSection({
  isAdmin,
  rows,
}: BenefitLifeEventsSectionProps) {
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

  const listConfiguration = buildBenefitLifeEventsListSurfaceConfiguration(
    rows,
    {
      empty: t("empty"),
      colDate: t("colDate"),
      colEmployee: t("colEmployee"),
      colEvent: t("colEvent"),
      colStatus: t("colStatus"),
      eventTypeLabel: (eventType) =>
        isBenefitLifeEventType(eventType)
          ? eventTypeLabel(eventType)
          : eventType,
      verificationStatusLabel: (status) =>
        isBenefitLifeEventVerificationStatus(status)
          ? verificationStatusLabel(status)
          : status,
      formatEventDate: (value) => value.toISOString().slice(0, 10),
    }
  )

  const rowById = new Map(rows.map((row) => [row.id, row]))

  return (
    <GovernedPatternCListSection
      layout="embedded"
      title=""
      listConfiguration={listConfiguration}
      surfaceKey="hrm:benefits:life-events"
      resolveConfiguredPermission={false}
      trailingColumn={
        isAdmin
          ? {
              header: t("colActions"),
              render: (surfaceRow) => {
                const row = rowById.get(surfaceRow.id)
                if (!row || row.verificationStatus !== "pending") {
                  return (
                    <span className="text-xs text-muted-foreground">—</span>
                  )
                }
                return <BenefitLifeEventVerifyActions lifeEventId={row.id} />
              },
            }
          : undefined
      }
    />
  )
}
