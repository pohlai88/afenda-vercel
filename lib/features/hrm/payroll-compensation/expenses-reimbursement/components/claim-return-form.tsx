"use client"

import { useActionState, useId } from "react"
import { useTranslations } from "next-intl"
import { Loader2 } from "lucide-react"

import { Alert, AlertDescription } from "#components2/ui/alert"
import { Button } from "#components2/ui/button"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "#components2/ui/field"

import { useFormSuccess } from "../../../_internal-cross-cutting/use-form-success.client"
import { returnClaimAction } from "../actions/claim-approval.actions"
import type { ClaimApprovalFormState } from "../../../types"

type ClaimReturnFormProps = {
  claimId: string
  onSuccess?: () => void
}

export function ClaimReturnForm({ claimId, onSuccess }: ClaimReturnFormProps) {
  const t = useTranslations("Dashboard.Hrm.claims")
  const [state, formAction, pending] = useActionState<
    ClaimApprovalFormState | undefined,
    FormData
  >(returnClaimAction, undefined)

  const reasonId = useId()
  const noteId = useId()
  useFormSuccess(state, onSuccess)

  const error = state && !state.ok ? state.errors : null

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="claimId" value={claimId} />

      {error?.form ? (
        <Alert variant="destructive">
          <AlertDescription>{error.form}</AlertDescription>
        </Alert>
      ) : null}

      <Field data-invalid={error?.returnedReason ? true : undefined}>
        <FieldLabel htmlFor={reasonId}>{t("returnReasonLabel")}</FieldLabel>
        <textarea
          id={reasonId}
          name="returnedReason"
          rows={3}
          maxLength={1000}
          required
          placeholder={t("returnReasonPlaceholder")}
          className="min-h-[72px] w-full rounded border border-border bg-background px-2 py-1.5 text-sm focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
          aria-invalid={Boolean(error?.returnedReason)}
        />
        {error?.returnedReason ? (
          <FieldError>{error.returnedReason}</FieldError>
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

      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? (
          <>
            <Loader2
              className="size-4 animate-spin"
              data-icon="inline-start"
              aria-hidden
            />
            {t("returning")}
          </>
        ) : (
          t("return")
        )}
      </Button>
    </form>
  )
}
