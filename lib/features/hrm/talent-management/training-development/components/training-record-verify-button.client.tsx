"use client"

import { submitVerifyTrainingRecord } from "../actions/training-record.actions"

type TrainingRecordVerifyButtonProps = {
  organizationId: string
  orgSlug: string
  recordId: string
  label: string
}

export function TrainingRecordVerifyButton({
  organizationId,
  orgSlug,
  recordId,
  label,
}: TrainingRecordVerifyButtonProps) {
  return (
    <form action={submitVerifyTrainingRecord}>
      <input type="hidden" name="organizationId" value={organizationId} />
      <input type="hidden" name="orgSlug" value={orgSlug} />
      <input type="hidden" name="recordId" value={recordId} />
      <button
        type="submit"
        className="text-xs font-medium text-primary underline-offset-4 hover:underline"
      >
        {label}
      </button>
    </form>
  )
}
