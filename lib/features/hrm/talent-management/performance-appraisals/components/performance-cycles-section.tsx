import { getFormatter, getTranslations } from "next-intl/server"

import {
  GovernedPatternCListSection,
  isListSurfaceTrailingActionRenderable,
} from "#features/governed-surface"

import { buildPerformanceCycleListSurfaceConfiguration } from "../data/performance-cycle-list-surface.server"
import type {
  HrmReviewCycleRow,
  HrmPerformanceReviewerChoiceRow,
} from "../data/performance.queries.server"
import type { HrmReviewPipeline } from "../schemas/performance.schema"

import { PerformanceCycleRowActions } from "./performance-cycle-row-actions.client"

function pipelineLabel(
  pipeline: HrmReviewPipeline,
  t: Awaited<ReturnType<typeof getTranslations<"Dashboard.Hrm.performance">>>
): string {
  return pipeline === "three_stage"
    ? t("reviewPipelineThreeStage")
    : t("reviewPipelineSingle")
}

type PerformanceCyclesSectionProps = {
  orgSlug: string
  cycles: readonly HrmReviewCycleRow[]
  reviewerChoices: readonly HrmPerformanceReviewerChoiceRow[]
  canUpdate: boolean
}

export async function PerformanceCyclesSection({
  orgSlug,
  cycles,
  reviewerChoices,
  canUpdate,
}: PerformanceCyclesSectionProps) {
  const [t, format] = await Promise.all([
    getTranslations("Dashboard.Hrm.performance"),
    getFormatter(),
  ])

  const listConfiguration = buildPerformanceCycleListSurfaceConfiguration(
    cycles,
    {
      eyebrow: t("eyebrow"),
      title: t("cyclesTitle"),
      description: t("cyclesDescription"),
      empty: t("cyclesEmpty"),
      colName: t("colCycleName"),
      colPeriod: t("colPeriod"),
      colState: t("colState"),
      colPipeline: t("colPipeline"),
      formatPeriod: (start, end) =>
        `${format.dateTime(start, { dateStyle: "medium" })} – ${format.dateTime(end, { dateStyle: "medium" })}`,
      formatPipeline: (pipeline) => pipelineLabel(pipeline, t),
    },
    {
      canUpdate,
      readOnlyUpdateReason: t("cyclesReadOnlyUpdateReason"),
    }
  )

  // Contract: performance cycle list surface row ids are cycle ids (`surface.rowKey: id`).
  const cycleById = new Map(cycles.map((row) => [row.id, row]))

  return (
    <GovernedPatternCListSection
      title={t("cyclesTitle")}
      description={t("cyclesDescription")}
      listConfiguration={listConfiguration}
      surfaceKey="hrm:performance:cycles"
      cardClassName="mt-0 border-solid border-border"
      forbidden={{
        variant: "forbidden",
        title: t("cyclesForbiddenTitle"),
        description: t("cyclesForbiddenDescription"),
      }}
      invalid={{
        variant: "error",
        title: t("cyclesLoadFailedTitle"),
        description: t("cyclesLoadFailed"),
      }}
      trailingColumn={{
        header: t("colActions"),
        render: (surfaceRow) => {
          if (
            !isListSurfaceTrailingActionRenderable(surfaceRow.trailingAction)
          ) {
            return null
          }
          const cycle = cycleById.get(surfaceRow.id)
          if (!cycle) return null
          return (
            <PerformanceCycleRowActions
              orgSlug={orgSlug}
              cycle={cycle}
              canUpdate={canUpdate}
              reviewerChoices={reviewerChoices}
            />
          )
        },
      }}
    />
  )
}
