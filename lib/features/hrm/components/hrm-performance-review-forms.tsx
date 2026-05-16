"use client"

import { useActionState, useId } from "react"
import { useTranslations } from "next-intl"
import { Loader2 } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "#components/ui/alert"
import { Button } from "#components/ui/button"
import { Input } from "#components/ui/input"
import { Textarea } from "#components/ui/textarea"

import {
  acknowledgeReviewAction,
  activateReviewCycleAction,
  cancelReviewAction,
  closeReviewCycleAction,
  createReviewCycleAction,
  submitReviewAction,
} from "#features/hrm/client"

type CreateReviewCycleFormProps = {
  orgSlug: string
}

export function HrmCreateReviewCycleForm({
  orgSlug,
}: CreateReviewCycleFormProps) {
  const t = useTranslations("Dashboard.Hrm.performance")
  const baseId = useId()
  const [state, formAction, pending] = useActionState(
    createReviewCycleAction,
    undefined
  )

  return (
    <form action={formAction} className="grid max-w-xl gap-3 sm:grid-cols-2">
      <input type="hidden" name="orgSlug" value={orgSlug} />

      {state && !state.ok && state.errors.form ? (
        <div className="sm:col-span-2">
          <Alert variant="destructive" className="py-2">
            <AlertTitle>{t("errorTitle")}</AlertTitle>
            <AlertDescription>{state.errors.form}</AlertDescription>
          </Alert>
        </div>
      ) : null}

      <div className="sm:col-span-2">
        <label
          className="text-sm text-muted-foreground"
          htmlFor={`${baseId}-name`}
        >
          {t("fieldName")}
        </label>
        <Input
          id={`${baseId}-name`}
          name="name"
          required
          className="mt-1"
          disabled={pending}
        />
      </div>
      <div>
        <label
          className="text-sm text-muted-foreground"
          htmlFor={`${baseId}-start`}
        >
          {t("fieldPeriodStart")}
        </label>
        <Input
          id={`${baseId}-start`}
          name="periodStart"
          type="date"
          required
          className="mt-1"
          disabled={pending}
        />
      </div>
      <div>
        <label
          className="text-sm text-muted-foreground"
          htmlFor={`${baseId}-end`}
        >
          {t("fieldPeriodEnd")}
        </label>
        <Input
          id={`${baseId}-end`}
          name="periodEnd"
          type="date"
          required
          className="mt-1"
          disabled={pending}
        />
      </div>
      <div className="sm:col-span-2">
        <label
          className="text-sm text-muted-foreground"
          htmlFor={`${baseId}-pipeline`}
        >
          {t("fieldReviewPipeline")}
        </label>
        <select
          id={`${baseId}-pipeline`}
          name="reviewPipeline"
          defaultValue="single"
          className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          disabled={pending}
        >
          <option value="single">{t("reviewPipelineSingle")}</option>
          <option value="three_stage">{t("reviewPipelineThreeStage")}</option>
        </select>
      </div>
      <div className="sm:col-span-2">
        <Button type="submit" variant="secondary" disabled={pending}>
          {pending ? (
            <>
              <Loader2 className="mr-1 size-4 animate-spin" aria-hidden />
              {t("saving")}
            </>
          ) : (
            t("createCycleSubmit")
          )}
        </Button>
      </div>
    </form>
  )
}

type ReviewerChoice = {
  linkedUserId: string
  employeeNumber: string
  legalName: string
}

type ActivateReviewCycleFormProps = {
  orgSlug: string
  cycleId: string
  reviewerChoices: readonly ReviewerChoice[]
}

export function HrmActivateReviewCycleForm({
  orgSlug,
  cycleId,
  reviewerChoices,
}: ActivateReviewCycleFormProps) {
  const t = useTranslations("Dashboard.Hrm.performance")
  const baseId = useId()
  const [state, formAction, pending] = useActionState(
    activateReviewCycleAction,
    undefined
  )

  return (
    <form action={formAction} className="grid min-w-64 gap-2">
      <input type="hidden" name="orgSlug" value={orgSlug} />
      <input type="hidden" name="cycleId" value={cycleId} />

      {state && !state.ok && state.errors.form ? (
        <Alert variant="destructive" className="py-2">
          <AlertTitle>{t("errorTitle")}</AlertTitle>
          <AlertDescription>{state.errors.form}</AlertDescription>
        </Alert>
      ) : null}

      <label
        className="text-xs text-muted-foreground"
        htmlFor={`${baseId}-fallback`}
      >
        {t("fallbackReviewer")}
      </label>
      <select
        id={`${baseId}-fallback`}
        name="fallbackReviewerUserId"
        className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
        disabled={pending}
      >
        <option value="">{t("selectReviewer")}</option>
        {reviewerChoices.map((choice) => (
          <option key={choice.linkedUserId} value={choice.linkedUserId}>
            {choice.employeeNumber} — {choice.legalName}
          </option>
        ))}
      </select>
      <p className="text-xs text-muted-foreground">
        {t("fallbackReviewerHint")}
      </p>
      <Button type="submit" size="sm" variant="secondary" disabled={pending}>
        {pending ? (
          <>
            <Loader2 className="mr-1 size-4 animate-spin" aria-hidden />
            {t("saving")}
          </>
        ) : (
          t("activateCycle")
        )}
      </Button>
    </form>
  )
}

type CloseReviewCycleFormProps = {
  orgSlug: string
  cycleId: string
}

export function HrmCloseReviewCycleForm({
  orgSlug,
  cycleId,
}: CloseReviewCycleFormProps) {
  const t = useTranslations("Dashboard.Hrm.performance")
  const [state, formAction, pending] = useActionState(
    closeReviewCycleAction,
    undefined
  )

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="orgSlug" value={orgSlug} />
      <input type="hidden" name="cycleId" value={cycleId} />

      {state && !state.ok && state.errors.form ? (
        <Alert variant="destructive" className="py-2">
          <AlertTitle>{t("errorTitle")}</AlertTitle>
          <AlertDescription>{state.errors.form}</AlertDescription>
        </Alert>
      ) : null}

      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        {pending ? (
          <>
            <Loader2 className="mr-1 size-4 animate-spin" aria-hidden />
            {t("saving")}
          </>
        ) : (
          t("closeCycle")
        )}
      </Button>
    </form>
  )
}

type SubmitReviewFormProps = {
  orgSlug: string
  reviewId: string
}

export function HrmSubmitPerformanceReviewForm({
  orgSlug,
  reviewId,
}: SubmitReviewFormProps) {
  const t = useTranslations("Dashboard.Hrm.performance")
  const baseId = useId()
  const [state, formAction, pending] = useActionState(
    submitReviewAction,
    undefined
  )

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="orgSlug" value={orgSlug} />
      <input type="hidden" name="reviewId" value={reviewId} />

      {state && !state.ok && state.errors.form ? (
        <Alert variant="destructive" className="py-2">
          <AlertTitle>{t("errorTitle")}</AlertTitle>
          <AlertDescription>{state.errors.form}</AlertDescription>
        </Alert>
      ) : null}

      <Input
        id={`${baseId}-rating`}
        name="rating"
        placeholder={t("ratingPlaceholder")}
        disabled={pending}
      />
      <Textarea
        id={`${baseId}-notes`}
        name="notes"
        placeholder={t("notesPlaceholder")}
        rows={2}
        disabled={pending}
      />
      <Textarea
        id={`${baseId}-competencies`}
        name="competencyScoresJson"
        placeholder={t("competencyScoresPlaceholder")}
        rows={2}
        disabled={pending}
      />
      <Button type="submit" size="sm" variant="secondary" disabled={pending}>
        {pending ? (
          <>
            <Loader2 className="mr-1 size-4 animate-spin" aria-hidden />
            {t("saving")}
          </>
        ) : (
          t("submitReview")
        )}
      </Button>
    </form>
  )
}

type CancelReviewFormProps = {
  orgSlug: string
  reviewId: string
}

export function HrmCancelPerformanceReviewForm({
  orgSlug,
  reviewId,
}: CancelReviewFormProps) {
  const t = useTranslations("Dashboard.Hrm.performance")
  const [state, formAction, pending] = useActionState(
    cancelReviewAction,
    undefined
  )

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="orgSlug" value={orgSlug} />
      <input type="hidden" name="reviewId" value={reviewId} />

      {state && !state.ok && state.errors.form ? (
        <Alert variant="destructive" className="py-2">
          <AlertTitle>{t("errorTitle")}</AlertTitle>
          <AlertDescription>{state.errors.form}</AlertDescription>
        </Alert>
      ) : null}

      <Button type="submit" size="sm" variant="ghost" disabled={pending}>
        {pending ? (
          <>
            <Loader2 className="mr-1 size-4 animate-spin" aria-hidden />
            {t("saving")}
          </>
        ) : (
          t("cancelReview")
        )}
      </Button>
    </form>
  )
}

type AcknowledgeReviewFormProps = {
  orgSlug: string
  reviewId: string
}

export function HrmAcknowledgePerformanceReviewForm({
  orgSlug,
  reviewId,
}: AcknowledgeReviewFormProps) {
  const t = useTranslations("Dashboard.Hrm.performance")
  const [state, formAction, pending] = useActionState(
    acknowledgeReviewAction,
    undefined
  )

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="orgSlug" value={orgSlug} />
      <input type="hidden" name="reviewId" value={reviewId} />

      {state && !state.ok && state.errors.form ? (
        <Alert variant="destructive" className="py-2">
          <AlertTitle>{t("errorTitle")}</AlertTitle>
          <AlertDescription>{state.errors.form}</AlertDescription>
        </Alert>
      ) : null}

      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        {pending ? (
          <>
            <Loader2 className="mr-1 size-4 animate-spin" aria-hidden />
            {t("saving")}
          </>
        ) : (
          t("acknowledgeReview")
        )}
      </Button>
    </form>
  )
}
