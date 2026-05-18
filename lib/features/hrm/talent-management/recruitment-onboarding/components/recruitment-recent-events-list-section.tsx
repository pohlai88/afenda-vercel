import { getTranslations } from "next-intl/server"

import { GovernedPatternCListSection } from "#features/governed-surface"

import { buildRecruitmentEventsListSurfaceConfiguration } from "../data/recruitment-events-list-surface.server"
import type { RecruitmentEventRow } from "../data/recruitment.queries.server"

type RecruitmentRecentEventsListSectionProps = {
  events: readonly RecruitmentEventRow[]
}

function formatWhen(value: Date): string {
  return value.toISOString().slice(0, 16).replace("T", " ")
}

function formatEvent(row: RecruitmentEventRow): string {
  if (!row.fromState && !row.toState) {
    return row.eventType
  }
  return `${row.eventType} (${row.fromState ?? "-"} → ${row.toState ?? "-"})`
}

export async function RecruitmentRecentEventsListSection({
  events,
}: RecruitmentRecentEventsListSectionProps) {
  const t = await getTranslations("Dashboard.Hrm.recruitment")

  const listConfiguration = buildRecruitmentEventsListSurfaceConfiguration(
    events,
    {
      empty: t("recentEventsEmpty"),
      colEvent: t("recentEventsTitle"),
      colWhen: t("colWhen"),
      formatEvent,
      formatWhen,
    }
  )

  return (
    <GovernedPatternCListSection
      title={t("recentEventsTitle")}
      listConfiguration={listConfiguration}
      surfaceKey="hrm:recruitment:events"
    />
  )
}
