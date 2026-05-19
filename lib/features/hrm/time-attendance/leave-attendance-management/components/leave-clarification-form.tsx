"use client"

import { useActionState, useEffect, useId, useRef } from "react"
import { useTranslations } from "next-intl"
import { Loader2 } from "lucide-react"

import { Alert, AlertDescription } from "#components2/ui/alert"
import { Button } from "#components2/ui/button"
import { Field, FieldError, FieldLabel } from "#components2/ui/field"

import {
  requestLeaveClarificationAction,
  type LeaveApprovalFormState,
} from "#features/hrm/client"

type LeaveClarificationFormProps = {
  requestId: string
  onSuccess?: () => void
}

export function LeaveClarificationForm({
  requestId,
  onSuccess,
}: LeaveClarificationFormProps) {
  const t = useTranslations("Dashboard.Hrm.leave")
  const [state, formAction, pending] = useActionState<
    LeaveApprovalFormState | undefined,
    FormData
  >(requestLeaveClarificationAction, undefined)

  const noteId = useId()
  const onSuccessRef = useRef(onSuccess)
  useEffect(() => {
    onSuccessRef.current = onSuccess
  }, [onSuccess])

  useEffect(() => {
    if (state?.ok) {
      onSuccessRef.current?.()
    }
  }, [state])

  const error = state && !state.ok ? state.errors : null

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="requestId" value={requestId} />

      {error?.form ? (
        <Alert variant="destructive">
          <AlertDescription>{error.form}</AlertDescription>
        </Alert>
      ) : null}

      <Field data-invalid={error?.clarificationNote ? true : undefined}>
        <FieldLabel htmlFor={noteId}>{t("clarificationNoteLabel")}</FieldLabel>
        <textarea
          id={noteId}
          name="clarificationNote"
          rows={3}
          maxLength={1000}
          required
          placeholder={t("clarificationNotePlaceholder")}
          className="min-h-[72px] w-full rounded border border-border bg-background px-2 py-1.5 text-sm focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
          aria-invalid={Boolean(error?.clarificationNote)}
        />
        {error?.clarificationNote ? (
          <FieldError>{error.clarificationNote}</FieldError>
        ) : null}
      </Field>

      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? (
          <>
            <Loader2
              className="size-4 animate-spin"
              data-icon="inline-start"
              aria-hidden
            />
            {t("requestingClarification")}
          </>
        ) : (
          t("requestClarification")
        )}
      </Button>
    </form>
  )
}
