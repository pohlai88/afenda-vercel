import { getTranslations } from "next-intl/server"

import { ModulePageHeader } from "#features/governed-surface"
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
import { Label } from "#components2/ui/label"
import {
  NativeSelect,
  NativeSelectOption,
} from "#components2/ui/native-select"
import { requireOrgSession } from "#lib/auth"

import { submitCreateReviewCycle } from "../actions/performance.actions"
import {
  listPerformanceReviewerChoicesForOrg,
  listPerformanceReviewsForOrg,
  listReviewCyclesForOrg,
} from "../data/performance.queries.server"

import { PerformanceCyclesSection } from "./performance-cycles-section"
import { PerformanceReviewsSection } from "./performance-reviews-section"

type HrmPerformancePageProps = {
  orgSlug: string
}

export async function HrmPerformancePage({ orgSlug }: HrmPerformancePageProps) {
  const session = await requireOrgSession()
  const organizationId = session.organizationId
  const viewerUserId = session.userId

  const [t, canCreate, canUpdate, cycles, reviews, reviewerChoices] =
    await Promise.all([
      getTranslations("Dashboard.Hrm.performance"),
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
              className="flex max-w-xl flex-col gap-3"
            >
              <input type="hidden" name="orgSlug" value={orgSlug} />
              <div>
                <Label
                  htmlFor="perf-cycle-name"
                  className="text-label-small text-muted-foreground"
                >
                  {t("fieldName")}
                </Label>
                <Input id="perf-cycle-name" name="name" required />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label
                    htmlFor="perf-period-start"
                    className="text-label-small text-muted-foreground"
                  >
                    {t("fieldPeriodStart")}
                  </Label>
                  <Input
                    id="perf-period-start"
                    name="periodStart"
                    type="date"
                    required
                  />
                </div>
                <div>
                  <Label
                    htmlFor="perf-period-end"
                    className="text-label-small text-muted-foreground"
                  >
                    {t("fieldPeriodEnd")}
                  </Label>
                  <Input
                    id="perf-period-end"
                    name="periodEnd"
                    type="date"
                    required
                  />
                </div>
              </div>
              <div>
                <Label
                  htmlFor="perf-pipeline"
                  className="text-label-small text-muted-foreground"
                >
                  {t("fieldReviewPipeline")}
                </Label>
                <NativeSelect
                  id="perf-pipeline"
                  name="reviewPipeline"
                  defaultValue="single"
                  className="w-full max-w-md"
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

      <PerformanceCyclesSection
        orgSlug={orgSlug}
        cycles={cycles}
        reviewerChoices={reviewerChoices}
        canUpdate={canUpdate}
      />

      <PerformanceReviewsSection
        orgSlug={orgSlug}
        reviews={reviews}
        viewerUserId={viewerUserId}
        canUpdate={canUpdate}
      />
    </div>
  )
}
