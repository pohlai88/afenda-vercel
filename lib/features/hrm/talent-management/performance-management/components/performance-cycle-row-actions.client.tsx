"use client"

import { useTranslations } from "next-intl"

import { Button } from "#components2/ui/button"
import {
  NativeSelect,
  NativeSelectOption,
} from "#components2/ui/native-select"

import {
  submitActivateReviewCycle,
  submitCloseReviewCycle,
} from "../actions/performance.actions"
import type { HrmReviewCycleRow } from "../data/performance.queries.server"
import type { HrmPerformanceReviewerChoiceRow } from "../data/performance.queries.server"

export type PerformanceCycleRowActionsProps = {
  orgSlug: string
  cycle: HrmReviewCycleRow
  canUpdate: boolean
  reviewerChoices: readonly HrmPerformanceReviewerChoiceRow[]
}

export function PerformanceCycleRowActions({
  orgSlug,
  cycle,
  canUpdate,
  reviewerChoices,
}: PerformanceCycleRowActionsProps) {
  const t = useTranslations("Dashboard.Hrm.performance")

  return (
    <div className="inline-flex flex-col items-end gap-2">
      {canUpdate && cycle.state === "draft" ? (
        <form
          action={submitActivateReviewCycle}
          className="inline-flex flex-col items-end gap-2"
        >
          <input type="hidden" name="orgSlug" value={orgSlug} />
          <input type="hidden" name="cycleId" value={cycle.id} />
          <label className="grid gap-1 text-left text-label-small text-muted-foreground">
            {t("fallbackReviewer")}
            <NativeSelect
              name="fallbackReviewerUserId"
              size="sm"
              className="min-w-48"
            >
              <NativeSelectOption value="">{t("selectReviewer")}</NativeSelectOption>
              {reviewerChoices.map((choice) => (
                <NativeSelectOption
                  key={choice.employeeId}
                  value={choice.linkedUserId}
                >
                  {choice.employeeNumber} — {choice.legalName}
                </NativeSelectOption>
              ))}
            </NativeSelect>
            <span>{t("fallbackReviewerHint")}</span>
          </label>
          <Button type="submit" size="sm" variant="secondary">
            {t("activateCycle")}
          </Button>
        </form>
      ) : null}
      {canUpdate && cycle.state === "active" ? (
        <form
          action={submitCloseReviewCycle}
          className="inline-flex justify-end"
        >
          <input type="hidden" name="orgSlug" value={orgSlug} />
          <input type="hidden" name="cycleId" value={cycle.id} />
          <Button type="submit" size="sm" variant="outline">
            {t("closeCycle")}
          </Button>
        </form>
      ) : null}
    </div>
  )
}
