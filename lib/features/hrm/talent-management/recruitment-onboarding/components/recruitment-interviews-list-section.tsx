import { getTranslations } from "next-intl/server"

import {
  GovernedPatternCListSection,
  isListSurfaceTrailingActionRenderable,
} from "#features/governed-surface"
import { GovernedTrailingActionSlot } from "#features/governed-surface/client"

import { buildRecruitmentInterviewsListSurfaceConfiguration } from "../data/recruitment-interviews-list-surface.server"
import type { InterviewQueueRow } from "../data/recruitment.queries.server"
import { HRM_INTERVIEW_OUTCOMES } from "../schemas/recruitment.schema"

import { RecruitmentInterviewTrailing } from "./recruitment-interview-trailing.client"

type RecruitmentInterviewsListSectionProps = {
  orgSlug: string
  interviews: readonly InterviewQueueRow[]
}

function formatScheduled(value: Date): string {
  return value.toISOString().slice(0, 16).replace("T", " ")
}

export async function RecruitmentInterviewsListSection({
  orgSlug,
  interviews,
}: RecruitmentInterviewsListSectionProps) {
  const t = await getTranslations("Dashboard.Hrm.recruitment")
  const interviewById = new Map(interviews.map((row) => [row.id, row]))

  const listConfiguration = buildRecruitmentInterviewsListSurfaceConfiguration(
    interviews,
    {
      empty: t("interviewsEmpty"),
      colCandidate: t("fieldCandidateName"),
      colRole: t("fieldRequisition"),
      colScheduled: t("fieldInterviewWhen"),
      colOutcome: t("fieldOutcome"),
      formatScheduled,
      outcomePending: "—",
    }
  )

  return (
    <GovernedPatternCListSection
      title={t("interviewsTitle")}
      listConfiguration={listConfiguration}
      surfaceKey="hrm:recruitment:interviews"
      trailingColumn={{
        header: t("submitFeedback"),
        render: (surfaceRow) => {
          const interview = interviewById.get(surfaceRow.id)
          const trailingAction = surfaceRow.trailingAction
          if (!interview || !isListSurfaceTrailingActionRenderable(trailingAction)) {
            return null
          }
          return (
            <GovernedTrailingActionSlot trailingAction={trailingAction}>
              <RecruitmentInterviewTrailing
                orgSlug={orgSlug}
                interviewId={interview.id}
                outcomes={HRM_INTERVIEW_OUTCOMES}
                fieldOutcome={t("fieldOutcome")}
                fieldFeedback={t("fieldFeedback")}
                submitLabel={t("submitFeedback")}
              />
            </GovernedTrailingActionSlot>
          )
        },
      }}
    />
  )
}
