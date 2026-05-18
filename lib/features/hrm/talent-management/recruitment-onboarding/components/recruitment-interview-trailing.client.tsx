"use client"

import { Button } from "#components2/ui/button"
import { Label } from "#components2/ui/label"
import { Textarea } from "#components2/ui/textarea"

import { submitInterviewFeedbackFormAction } from "../actions/recruitment.actions"
import type { HrmInterviewOutcome } from "../schemas/recruitment.schema"

type RecruitmentInterviewTrailingProps = {
  orgSlug: string
  interviewId: string
  outcomes: readonly HrmInterviewOutcome[]
  fieldOutcome: string
  fieldFeedback: string
  submitLabel: string
}

export function RecruitmentInterviewTrailing({
  orgSlug,
  interviewId,
  outcomes,
  fieldOutcome,
  fieldFeedback,
  submitLabel,
}: RecruitmentInterviewTrailingProps) {
  return (
    <form
      action={submitInterviewFeedbackFormAction}
      className="flex min-w-[14rem] flex-col gap-2"
    >
      <input type="hidden" name="orgSlug" value={orgSlug} />
      <input type="hidden" name="interviewId" value={interviewId} />
      <div className="flex flex-col gap-1">
        <Label htmlFor={`outcome-${interviewId}`} className="text-xs">
          {fieldOutcome}
        </Label>
        <select
          id={`outcome-${interviewId}`}
          name="outcome"
          required
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          {outcomes.map((outcome) => (
            <option key={outcome} value={outcome}>
              {outcome}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor={`feedback-${interviewId}`} className="text-xs">
          {fieldFeedback}
        </Label>
        <Textarea
          id={`feedback-${interviewId}`}
          name="feedback"
          rows={3}
          maxLength={4000}
        />
      </div>
      <Button type="submit" size="sm" variant="secondary">
        {submitLabel}
      </Button>
    </form>
  )
}
