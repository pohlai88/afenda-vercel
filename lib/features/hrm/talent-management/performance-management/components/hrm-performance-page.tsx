import { getFormatter, getTranslations } from "next-intl/server"

import {
  GovernedComponentRenderer,
  GovernedListSurfaceWithTrailingColumn,
} from "#components2/metadata"
import { GovernedEmpty, ModulePageHeader } from "#features/governed-surface"
import { parseListSurfaceRendererConfiguration } from "#features/governed-surface/schemas/list-surface-renderer.schema"
import { resolveGovernedErpPermissionAllowed } from "#features/governed-surface/server"
import { canUseErpPermissionForCurrentOrg } from "#features/erp-rbac/server"
import { Button } from "#components2/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#components2/ui/card"
import { Input } from "#components2/ui/input"
import {
  NativeSelect,
  NativeSelectOption,
} from "#components2/ui/native-select"
import { requireOrgSession } from "#lib/auth"

import { submitCreateReviewCycle } from "../actions/performance.actions"
import { buildPerformanceCycleListSurfaceConfiguration } from "../data/performance-cycle-list-surface.server"
import { buildPerformanceReviewListSurfaceConfiguration } from "../data/performance-review-list-surface.server"
import {
  listPerformanceReviewerChoicesForOrg,
  listPerformanceReviewsForOrg,
  listReviewCyclesForOrg,
} from "../data/performance.queries.server"
import type { HrmReviewPipeline } from "../schemas/performance.schema"

import { PerformanceCycleRowActions } from "./performance-cycle-row-actions.client"
import { PerformanceReviewRowActions } from "./performance-review-row-actions.client"

type HrmPerformancePageProps = {
  orgSlug: string
}

function pipelineLabel(
  pipeline: HrmReviewPipeline,
  t: Awaited<ReturnType<typeof getTranslations<"Dashboard.Hrm.performance">>>
): string {
  return pipeline === "three_stage"
    ? t("reviewPipelineThreeStage")
    : t("reviewPipelineSingle")
}

export async function HrmPerformancePage({ orgSlug }: HrmPerformancePageProps) {
  const session = await requireOrgSession()
  const organizationId = session.organizationId
  const viewerUserId = session.userId

  const [t, format, canCreate, canUpdate, cycles, reviews, reviewerChoices] =
    await Promise.all([
      getTranslations("Dashboard.Hrm.performance"),
      getFormatter(),
      canUseErpPermissionForCurrentOrg({
        module: "hrm",
        object: "performance",
        function: "create",
      }),
      canUseErpPermissionForCurrentOrg({
        module: "hrm",
        object: "performance",
        function: "update",
      }),
      listReviewCyclesForOrg(organizationId),
      listPerformanceReviewsForOrg(organizationId),
      listPerformanceReviewerChoicesForOrg(organizationId),
    ])

  const cycleListConfiguration = buildPerformanceCycleListSurfaceConfiguration(
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
    }
  )

  const reviewListConfiguration =
    buildPerformanceReviewListSurfaceConfiguration(reviews, {
      eyebrow: t("eyebrow"),
      title: t("reviewsTitle"),
      description: t("reviewsDescription"),
      empty: t("reviewsEmpty"),
      colCycle: t("colCycle"),
      colEmployee: t("colEmployee"),
      colReviewer: t("colReviewer"),
      colStage: t("colStage"),
      formatReviewer: (reviewerId) => `${reviewerId.slice(0, 8)}…`,
    })

  const [canReadCycles, canReadReviews] = await Promise.all([
    resolveGovernedErpPermissionAllowed(
      cycleListConfiguration.requiresErpPermission
    ),
    resolveGovernedErpPermissionAllowed(
      reviewListConfiguration.requiresErpPermission
    ),
  ])

  const parsedCycles = parseListSurfaceRendererConfiguration(
    cycleListConfiguration
  )
  const parsedReviews = parseListSurfaceRendererConfiguration(
    reviewListConfiguration
  )

  const cycleById = new Map(cycles.map((row) => [row.id, row]))
  const reviewById = new Map(reviews.map((row) => [row.reviewId, row]))

  return (
    <div className="flex flex-col gap-6 p-6">
      <ModulePageHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={t("description")}
      />

      {canCreate ? (
        <Card size="sm">
          <CardHeader>
            <CardTitle className="text-base">{t("createCycleTitle")}</CardTitle>
            <CardDescription>{t("createCycleDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              action={submitCreateReviewCycle}
              className="grid max-w-xl gap-3"
            >
              <input type="hidden" name="orgSlug" value={orgSlug} />
              <div>
                <label
                  className="text-sm text-muted-foreground"
                  htmlFor="perf-cycle-name"
                >
                  {t("fieldName")}
                </label>
                <Input
                  id="perf-cycle-name"
                  name="name"
                  required
                  className="mt-1"
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label
                    className="text-sm text-muted-foreground"
                    htmlFor="perf-period-start"
                  >
                    {t("fieldPeriodStart")}
                  </label>
                  <Input
                    id="perf-period-start"
                    name="periodStart"
                    type="date"
                    required
                    className="mt-1"
                  />
                </div>
                <div>
                  <label
                    className="text-sm text-muted-foreground"
                    htmlFor="perf-period-end"
                  >
                    {t("fieldPeriodEnd")}
                  </label>
                  <Input
                    id="perf-period-end"
                    name="periodEnd"
                    type="date"
                    required
                    className="mt-1"
                  />
                </div>
              </div>
              <div>
                <label
                  className="text-sm text-muted-foreground"
                  htmlFor="perf-pipeline"
                >
                  {t("fieldReviewPipeline")}
                </label>
                <NativeSelect
                  id="perf-pipeline"
                  name="reviewPipeline"
                  defaultValue="single"
                  className="mt-1 w-full max-w-md"
                >
                  <NativeSelectOption value="single">
                    {t("reviewPipelineSingle")}
                  </NativeSelectOption>
                  <NativeSelectOption value="three_stage">
                    {t("reviewPipelineThreeStage")}
                  </NativeSelectOption>
                </NativeSelect>
              </div>
              <Button type="submit" variant="secondary" className="max-w-xs">
                {t("createCycleSubmit")}
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {canReadCycles && parsedCycles.success ? (
        cycles.length === 0 ? (
          <GovernedComponentRenderer
            component={{
              type: "governed:list-surface",
              serverType: "governed:list-surface",
              configuration: cycleListConfiguration,
            }}
            surfaceKey="hrm:performance:cycles"
          />
        ) : (
          <Card size="sm">
            <CardHeader>
              <CardTitle className="text-base">{t("cyclesTitle")}</CardTitle>
              <CardDescription>{t("cyclesDescription")}</CardDescription>
            </CardHeader>
            <CardContent>
              <GovernedListSurfaceWithTrailingColumn
                columns={parsedCycles.data.columns}
                rows={parsedCycles.data.rows}
                trailingColumn={
                  canUpdate
                    ? {
                        header: t("colActions"),
                        render: (surfaceRow) => {
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
                      }
                    : undefined
                }
              />
            </CardContent>
          </Card>
        )
      ) : (
        <Card size="sm">
          <CardHeader>
            <CardTitle className="text-base">{t("cyclesTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            {canReadCycles ? (
              <GovernedEmpty
                model={{
                  variant: "muted",
                  title: t("cyclesEmpty"),
                }}
              />
            ) : (
              <GovernedEmpty
                model={{
                  variant: "forbidden",
                  title: t("cyclesTitle"),
                  description:
                    "You do not have permission to view performance cycles.",
                }}
              />
            )}
          </CardContent>
        </Card>
      )}

      {canReadReviews && parsedReviews.success ? (
        reviews.length === 0 ? (
          <GovernedComponentRenderer
            component={{
              type: "governed:list-surface",
              serverType: "governed:list-surface",
              configuration: reviewListConfiguration,
            }}
            surfaceKey="hrm:performance:reviews"
          />
        ) : (
          <Card size="sm">
            <CardHeader>
              <CardTitle className="text-base">{t("reviewsTitle")}</CardTitle>
              <CardDescription>{t("reviewsDescription")}</CardDescription>
            </CardHeader>
            <CardContent>
              <GovernedListSurfaceWithTrailingColumn
                columns={parsedReviews.data.columns}
                rows={parsedReviews.data.rows}
                trailingColumn={{
                  header: t("colActions"),
                  render: (surfaceRow) => {
                    const review = reviewById.get(surfaceRow.id)
                    if (!review) return null
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
            </CardContent>
          </Card>
        )
      ) : (
        <Card size="sm">
          <CardHeader>
            <CardTitle className="text-base">{t("reviewsTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            {canReadReviews ? (
              <GovernedEmpty
                model={{
                  variant: "muted",
                  title: t("reviewsEmpty"),
                }}
              />
            ) : (
              <GovernedEmpty
                model={{
                  variant: "forbidden",
                  title: t("reviewsTitle"),
                  description:
                    "You do not have permission to view performance reviews.",
                }}
              />
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
