"use client"

import { useActionState, useEffect, useId, useRef } from "react"
import { useTranslations } from "next-intl"
import { Loader2 } from "lucide-react"

import { Alert, AlertDescription } from "#components/ui/alert"
import { Button } from "#components/ui/button"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "#components/ui/field"

import { rejectClaimAction } from "../actions/claim-approval.actions"
import type { ClaimApprovalFormState } from "../../../types"

type ClaimRejectFormProps = {
  claimId: string
  onSuccess?: () => void
}

/**
 * Reject-claim form body. Lives outside the parent dialog so the
 * cross-boundary `onSuccess` close reads as a normal callback.
 * Mirrors {@link import('./leave-reject-form').LeaveRejectForm}.
 */
export function ClaimRejectForm({ claimId, onSuccess }: ClaimRejectFormProps) {
  const t = useTranslations("Dashboard.Hrm.claims")
  const [state, formAction, pending] = useActionState<
    ClaimApprovalFormState | undefined,
    FormData
  >(rejectClaimAction, undefined)

  const reasonId = useId()
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
      <input type="hidden" name="claimId" value={claimId} />

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
