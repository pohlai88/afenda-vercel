"use client"

import { useTranslations } from "next-intl"

import { Button } from "#components2/ui/button"
import { Input } from "#components2/ui/input"
import { Label } from "#components2/ui/label"

import {
  advanceApplicationStageFormAction,
  createJobOfferFormAction,
  scheduleInterviewFormAction,
} from "../actions/recruitment.actions"
import { APPLICATION_STAGE_TRANSITIONS } from "../data/recruitment-workflow.shared"
import { resolveRecruitmentMoveToStageLabel } from "../data/recruitment-pipeline-i18n.shared"
import type { HrmApplicationStage } from "../schemas/recruitment.schema"

const TERMINAL_ADVANCE_STAGES = new Set<HrmApplicationStage>([
  "rejected",
  "withdrawn",
  "archived",
])

export type RecruitmentPipelineCardContext = {
  applicationId: string
  stage: HrmApplicationStage
  interviewCount: number
  convertedEmployeeId: string | null
}

export function RecruitmentPipelineCardActions({
  orgSlug,
  userId,
  context,
}: {
  orgSlug: string
  userId: string
  context: RecruitmentPipelineCardContext
}) {
  const t = useTranslations("Dashboard.Hrm.recruitment")
  const advanceStages = APPLICATION_STAGE_TRANSITIONS[context.stage].filter(
    (stage) => !TERMINAL_ADVANCE_STAGES.has(stage)
  )

  return (
    <div className="flex flex-col gap-2 border-t border-border pt-2">
      {advanceStages.map((stage) => (
        <StageAdvanceForm
          key={stage}
          orgSlug={orgSlug}
          applicationId={context.applicationId}
          stage={stage}
          label={resolveRecruitmentMoveToStageLabel(t, stage)}
        />
      ))}
      {context.stage === "interview" ? (
        <>
          <form
            action={scheduleInterviewFormAction}
            className="flex flex-col gap-1"
          >
            <input type="hidden" name="orgSlug" value={orgSlug} />
            <input
              type="hidden"
              name="applicationId"
              value={context.applicationId}
            />
            <input type="hidden" name="interviewerUserId" value={userId} />
            <Label htmlFor={`iv-${context.applicationId}`} className="text-xs">
              {t("fieldInterviewWhen")}
            </Label>
            <Input
              id={`iv-${context.applicationId}`}
              name="scheduledAt"
              type="datetime-local"
              required
              className="h-8 text-xs"
            />
            <Button
              type="submit"
              size="sm"
              variant="secondary"
              className="h-7 text-xs"
            >
              {t("scheduleInterview")}
            </Button>
          </form>
          <OfferCreateForm
            orgSlug={orgSlug}
            applicationId={context.applicationId}
          />
        </>
      ) : null}
      {context.stage !== "hired" && context.stage !== "rejected" ? (
        <StageAdvanceForm
          orgSlug={orgSlug}
          applicationId={context.applicationId}
          stage="rejected"
          label={t("reject")}
          variant="outline"
        />
      ) : null}
    </div>
  )
}

function StageAdvanceForm({
  orgSlug,
  applicationId,
  stage,
  label,
  variant = "secondary",
}: {
  orgSlug: string
  applicationId: string
  stage: string
  label: string
  variant?: "secondary" | "outline"
}) {
  return (
    <form action={advanceApplicationStageFormAction}>
      <input type="hidden" name="orgSlug" value={orgSlug} />
      <input type="hidden" name="applicationId" value={applicationId} />
      <input type="hidden" name="stage" value={stage} />
      <Button type="submit" size="sm" variant={variant} className="h-7 text-xs">
        {label}
      </Button>
    </form>
  )
}

function OfferCreateForm({
  orgSlug,
  applicationId,
}: {
  orgSlug: string
  applicationId: string
}) {
  const t = useTranslations("Dashboard.Hrm.recruitment")

  return (
    <form action={createJobOfferFormAction} className="flex flex-col gap-1">
      <input type="hidden" name="orgSlug" value={orgSlug} />
      <input type="hidden" name="applicationId" value={applicationId} />
      <Label htmlFor={`offer-amount-${applicationId}`} className="text-xs">
        {t("fieldAmount")}
      </Label>
      <Input
        id={`offer-amount-${applicationId}`}
        name="compensationAmount"
        inputMode="decimal"
        className="h-8 text-xs"
      />
      <div className="grid grid-cols-2 gap-1">
        <div className="flex flex-col gap-1">
          <Label
            htmlFor={`offer-currency-${applicationId}`}
            className="text-xs"
          >
            {t("fieldCurrency")}
          </Label>
          <Input
            id={`offer-currency-${applicationId}`}
            name="compensationCurrency"
            defaultValue="MYR"
            maxLength={3}
            className="h-8 text-xs"
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor={`offer-start-${applicationId}`} className="text-xs">
            {t("fieldStartDate")}
          </Label>
          <Input
            id={`offer-start-${applicationId}`}
            name="proposedStartDate"
            type="date"
            className="h-8 text-xs"
          />
        </div>
      </div>
      <Button
        type="submit"
        size="sm"
        variant="secondary"
        className="h-7 text-xs"
      >
        {t("createOffer")}
      </Button>
    </form>
  )
}
