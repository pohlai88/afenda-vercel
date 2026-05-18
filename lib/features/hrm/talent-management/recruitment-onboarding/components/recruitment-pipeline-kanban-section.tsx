import { getTranslations } from "next-intl/server"

import { GovernedKanbanFooterSection } from "#features/governed-surface"

import { buildRecruitmentPipelineKanbanConfiguration } from "../data/recruitment-surface-builders.server"
import type { ApplicationPipelineRow } from "../data/recruitment.queries.server"
import { HRM_APPLICATION_STAGES } from "../schemas/recruitment.schema"
import { resolveRecruitmentStageLabel } from "../data/recruitment-pipeline-i18n.shared"

import {
  RECRUITMENT_PIPELINE_KANBAN_SURFACE_KEY,
  RecruitmentPipelineKanbanBoard,
} from "./recruitment-pipeline-kanban.client"

type RecruitmentPipelineKanbanSectionProps = {
  orgSlug: string
  userId: string
  rows: readonly ApplicationPipelineRow[]
  interviewCounts: ReadonlyMap<string, number>
}

export async function RecruitmentPipelineKanbanSection({
  orgSlug,
  userId,
  rows,
  interviewCounts,
}: RecruitmentPipelineKanbanSectionProps) {
  const t = await getTranslations("Dashboard.Hrm.recruitment")

  const stageLabels = Object.fromEntries(
    HRM_APPLICATION_STAGES.map((stage) => [
      stage,
      resolveRecruitmentStageLabel(t, stage),
    ])
  ) as Record<
    (typeof HRM_APPLICATION_STAGES)[number],
    string
  >

  const configuration = buildRecruitmentPipelineKanbanConfiguration(
    rows,
    interviewCounts,
    {
      boardAriaLabel: t("pipelineTitle"),
      stageLabels,
      pipelineEmpty: t("pipelineEmpty"),
      interviewCount: (count) => t("interviewCount", { count }),
      convertedEmployee: t("convertedEmployee"),
    }
  )

  const cardContexts = Object.fromEntries(
    rows.map((row) => [
      row.id,
      {
        applicationId: row.id,
        stage: row.stage,
        interviewCount: interviewCounts.get(row.id) ?? 0,
        convertedEmployeeId: row.convertedEmployeeId,
      },
    ])
  )

  return (
    <GovernedKanbanFooterSection
      surfaceKey={RECRUITMENT_PIPELINE_KANBAN_SURFACE_KEY}
      sectionTestId="governed-list-section:hrm:recruitment:pipeline"
      title={t("pipelineTitle")}
    >
      <RecruitmentPipelineKanbanBoard
        configuration={configuration}
        cardContexts={cardContexts}
        orgSlug={orgSlug}
        userId={userId}
      />
    </GovernedKanbanFooterSection>
  )
}
