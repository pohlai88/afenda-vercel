import { getTranslations } from "next-intl/server"

import {
  GovernedPatternCListSection,
  isListSurfaceTrailingActionRenderable,
} from "#features/governed-surface"

import { buildPerformanceReviewListSurfaceConfiguration } from "../data/performance-review-list-surface.server"
import type { HrmPerformanceReviewListRow } from "../data/performance.queries.server"

import { PerformanceReviewRowActions } from "./performance-review-row-actions.client"

type PerformanceReviewsSectionProps = {
  orgSlug: string
  reviews: readonly HrmPerformanceReviewListRow[]
  viewerUserId: string
  canUpdate: boolean
}

export async function PerformanceReviewsSection({
  orgSlug,
  reviews,
  viewerUserId,
  canUpdate,
}: PerformanceReviewsSectionProps) {
  const t = await getTranslations("Dashboard.Hrm.performance")

  const listConfiguration = buildPerformanceReviewListSurfaceConfiguration(
    reviews,
    {
      eyebrow: t("eyebrow"),
      title: t("reviewsTitle"),
      description: t("reviewsDescription"),
      empty: t("reviewsEmpty"),
      colCycle: t("colCycle"),
      colEmployee: t("colEmployee"),
      colReviewer: t("colReviewer"),
      colStage: t("colStage"),
      unassignedReviewer: t("unassignedReviewer"),
    },
    { canUpdate, viewerUserId }
  )

  // Contract: performance review list surface row ids are review ids (`surface.rowKey: reviewId`).
  const reviewById = new Map(reviews.map((row) => [row.reviewId, row]))

  return (
    <GovernedPatternCListSection
      title={t("reviewsTitle")}
      description={t("reviewsDescription")}
      listConfiguration={listConfiguration}
      surfaceKey="hrm:performance:reviews"
      cardClassName="mt-0 border-solid border-border"
      forbidden={{
        variant: "forbidden",
        title: t("reviewsForbiddenTitle"),
        description: t("reviewsForbiddenDescription"),
      }}
      invalid={{
        variant: "error",
        title: t("reviewsLoadFailedTitle"),
        description: t("reviewsLoadFailed"),
      }}
      trailingColumn={{
        header: t("colActions"),
        render: (surfaceRow) => {
          if (
            !isListSurfaceTrailingActionRenderable(surfaceRow.trailingAction)
          ) {
            return null
          }

          const review = reviewById.get(surfaceRow.id)

          if (!review) {
            return null
          }

          return (
            <PerformanceReviewRowActions
              orgSlug={orgSlug}
              review={review}
              viewerUserId={viewerUserId}
              canUpdate={canUpdate}
            />
          )
        },
      }}
    />
  )
}
