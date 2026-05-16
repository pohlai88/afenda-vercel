"use client"

import { useActionState } from "react"
import { useTranslations } from "next-intl"

import { Button } from "#components/ui/button"
import { Input } from "#components/ui/input"
import { Label } from "#components/ui/label"
import { Textarea } from "#components/ui/textarea"

import {
  portalSubmitTrainingFeedbackAction,
  type PortalTrainingFormState,
} from "../actions/training-portal.actions"

type EmployeePortalTrainingFeedbackFormProps = {
  readonly portalSlug: string
  readonly organizationId: string
  readonly recordId: string
  readonly courseName: string
}

const initialState: PortalTrainingFormState = { ok: true }

export function EmployeePortalTrainingFeedbackForm({
  portalSlug,
  organizationId,
  recordId,
  courseName,
}: EmployeePortalTrainingFeedbackFormProps) {
  const t = useTranslations("Dashboard.Hrm.training")
  const [state, formAction, pending] = useActionState(
    async (
      _prev: PortalTrainingFormState,
      formData: FormData
    ): Promise<PortalTrainingFormState> =>
      portalSubmitTrainingFeedbackAction(formData),
    initialState
  )

  return (
    <form
      action={formAction}
      className="mt-3 grid max-w-md gap-2 rounded-md border p-3"
    >
      <input type="hidden" name="portalSlug" value={portalSlug} />
      <input type="hidden" name="organizationId" value={organizationId} />
      <input type="hidden" name="recordId" value={recordId} />
      <p className="text-xs font-medium">{courseName}</p>
      <div className="grid gap-1">
        <Label htmlFor={`rating-${recordId}`}>
          {t("portalFeedbackRating")}
        </Label>
        <Input
          id={`rating-${recordId}`}
          name="feedbackRating"
          type="number"
          min={1}
          max={5}
          required
          className="h-8 w-20"
        />
      </div>
      <div className="grid gap-1">
        <Label htmlFor={`feedback-${recordId}`}>
          {t("portalFeedbackComment")}
        </Label>
        <Textarea
          id={`feedback-${recordId}`}
          name="feedbackText"
          rows={2}
          maxLength={4000}
          placeholder={t("portalFeedbackCommentPlaceholder")}
        />
      </div>
      {state.ok === false && state.errors.form ? (
        <p className="text-xs text-destructive">{state.errors.form}</p>
      ) : null}
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? t("portalFeedbackSubmitting") : t("portalFeedbackSubmit")}
      </Button>
    </form>
  )
}
