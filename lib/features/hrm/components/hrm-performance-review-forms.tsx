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
  createReviewCycleAction,
  submitReviewAction,
} from "#features/hrm/client"

type CreateReviewCycleFormProps = {
  orgSlug: string
}

export function HrmCreateReviewCycleForm({ orgSlug }: CreateReviewCycleFormProps) {
  const t = useTranslations("Dashboard.Hrm.performance")
  const baseId = useId()
  const [state, formAction, pending] = useActionState(
    createReviewCycleAction,
    undefined
  )

  return (
    <form
      action={formAction}
      className="grid max-w-xl gap-3 sm:grid-cols-2"
    >
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
          className="text-muted-foreground text-sm"
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
          className="text-muted-foreground text-sm"
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
          className="text-muted-foreground text-sm"
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
          className="text-muted-foreground text-sm"
          htmlFor={`${baseId}-pipeline`}
        >
          {t("fieldReviewPipeline")}
        </label>
        <select
          id={`${baseId}-pipeline`}
          name="reviewPipeline"
          defaultValue="single"
          className="border-input bg-background mt-1 flex h-9 w-full rounded-md border px-3 text-sm"
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
