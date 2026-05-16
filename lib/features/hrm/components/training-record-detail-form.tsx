"use client"

import { useActionState } from "react"
import { useFormStatus } from "react-dom"

import type { TrainingMutationFormState } from "../data/training.types.shared"

// ---------------------------------------------------------------------------
// Internal: submit button with pending state
// ---------------------------------------------------------------------------
function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-9 w-fit items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-60"
    >
      {pending ? "…" : label}
    </button>
  )
}

// ---------------------------------------------------------------------------
// Ad-hoc training completion form (self-service or HR-initiated)
// ---------------------------------------------------------------------------
export type TrainingRecordDetailFormProps = {
  organizationId: string
  orgSlug: string
  courseId: string
  assignmentId?: string
  /** Server Action bound to completeTrainingRecordAction */
  completeAction: (
    prevState: TrainingMutationFormState,
    formData: FormData
  ) => Promise<TrainingMutationFormState>
  labels: {
    title: string
    completedAt: string
    hoursCompleted: string
    costAmount: string
    costCurrency: string
    certificateDocument: string
    notes: string
    submit: string
    successMessage: string
    errorFallback: string
  }
}

const INITIAL_STATE: TrainingMutationFormState = { ok: true }

export function TrainingRecordDetailForm({
  organizationId,
  orgSlug,
  courseId,
  assignmentId,
  completeAction,
  labels,
}: TrainingRecordDetailFormProps) {
  const [state, formAction] = useActionState(completeAction, INITIAL_STATE)

  return (
    <div className="grid gap-4">
      {state.ok ? null : (
        <p
          role="alert"
          className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {state.errors.form ?? labels.errorFallback}
        </p>
      )}

      <form action={formAction} className="grid gap-3">
        <input type="hidden" name="organizationId" value={organizationId} />
        <input type="hidden" name="orgSlug" value={orgSlug} />
        <input type="hidden" name="courseId" value={courseId} />
        {assignmentId ? (
          <input type="hidden" name="assignmentId" value={assignmentId} />
        ) : null}

        <label className="grid gap-1 text-sm">
          <span className="font-medium">{labels.completedAt}</span>
          <input
            name="completedAt"
            type="date"
            required
            defaultValue={new Date().toISOString().slice(0, 10)}
            className="flex h-9 rounded-md border border-input bg-background px-3 text-sm"
          />
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-sm">
            <span className="font-medium">{labels.hoursCompleted}</span>
            <input
              name="hoursCompleted"
              type="number"
              min={0}
              step={0.5}
              className="flex h-9 rounded-md border border-input bg-background px-3 text-sm"
            />
          </label>

          <label className="grid gap-1 text-sm">
            <span className="font-medium">{labels.costAmount}</span>
            <input
              name="costAmount"
              type="number"
              min={0}
              step={0.01}
              className="flex h-9 rounded-md border border-input bg-background px-3 text-sm"
            />
          </label>
        </div>

        <label className="grid gap-1 text-sm">
          <span className="font-medium">{labels.certificateDocument}</span>
          <input
            name="certificateUrl"
            type="url"
            placeholder="https://…"
            className="flex h-9 rounded-md border border-input bg-background px-3 text-sm"
          />
          <span className="text-xs text-muted-foreground">
            {labels.certificateDocument}
          </span>
        </label>

        <label className="grid gap-1 text-sm">
          <span className="font-medium">{labels.notes}</span>
          <textarea
            name="notes"
            rows={3}
            className="flex rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </label>

        <SubmitButton label={labels.submit} />
      </form>
    </div>
  )
}
