"use client"

import { useActionState, useId } from "react"
import { useTranslations } from "next-intl"
import { Loader2 } from "lucide-react"

import { Alert, AlertDescription } from "#components2/ui/alert"
import { Button } from "#components2/ui/button"

import { useFormSuccess } from "../../../_internal-cross-cutting/use-form-success.client"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "#components2/ui/field"

import {
  rejectLeaveAction,
  type LeaveApprovalFormState,
} from "#features/hrm/client"

type LeaveRejectFormProps = {
  requestId: string
  onSuccess?: () => void
}

/**
 * Reject-leave form body. Lives outside the dialog wrapper so the
 * `onSuccess` callback (parent dialog close) reads as a normal function
 * to ESLint, mirroring `LeaveApplyForm` / `EmployeeCreateForm`.
 */
export function LeaveRejectForm({
  requestId,
  onSuccess,
}: LeaveRejectFormProps) {
  const t = useTranslations("Dashboard.Hrm.leave")
  const [state, formAction, pending] = useActionState<
    LeaveApprovalFormState | undefined,
    FormData
  >(rejectLeaveAction, undefined)

  const reasonId = useId()
  const noteId = useId()
  useFormSuccess(state, onSuccess)

  const error = state && !state.ok ? state.errors : null

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="requestId" value={requestId} />

      {error?.form ? (
        <Alert variant="destructive">
          <AlertDescription>{error.form}</AlertDescription>
        </Alert>
      ) : null}

      <Field data-invalid={error?.rejectedReason ? true : undefined}>
        <FieldLabel htmlFor={reasonId}>{t("rejectReasonLabel")}</FieldLabel>
        <textarea
          id={reasonId}
          name="rejectedReason"
          rows={3}
          maxLength={1000}
          required
          placeholder={t("rejectReasonPlaceholder")}
          className="min-h-[72px] w-full rounded border border-border bg-background px-2 py-1.5 text-sm focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
          aria-invalid={Boolean(error?.rejectedReason)}
        />
        {error?.rejectedReason ? (
          <FieldError>{error.rejectedReason}</FieldError>
        ) : null}
      </Field>

      <Field>
        <FieldLabel htmlFor={noteId}>{t("decisionNoteLabel")}</FieldLabel>
        <textarea
          id={noteId}
          name="decisionNote"
          rows={2}
          maxLength={1000}
          placeholder={t("decisionNotePlaceholder")}
          className="min-h-[60px] w-full rounded border border-border bg-background px-2 py-1.5 text-sm focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
        />
        <FieldDescription>{t("decisionNotePlaceholder")}</FieldDescription>
      </Field>

      <Button type="submit" variant="destructive" disabled={pending}>
        {pending ? (
          <>
            <Loader2
              className="size-4 animate-spin"
              data-icon="inline-start"
              aria-hidden
            />
            {t("rejecting")}
          </>
        ) : (
          t("reject")
        )}
      </Button>
    </form>
  )
}
