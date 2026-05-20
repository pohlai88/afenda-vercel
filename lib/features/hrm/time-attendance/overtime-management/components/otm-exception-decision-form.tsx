"use client"

import { useActionState } from "react"
import { useTranslations } from "next-intl"
import { Loader2 } from "lucide-react"

import { Button } from "#components2/ui/button"
import { FieldError } from "#components2/ui/field"

import {
  approveOtmExceptionAction,
  rejectOtmExceptionAction,
  type OtmExceptionDecisionFormState,
} from "#features/hrm/client"

type OtmExceptionDecisionFormsProps = {
  exceptionId: string
}

export function OtmExceptionDecisionForms({
  exceptionId,
}: OtmExceptionDecisionFormsProps) {
  const t = useTranslations("Dashboard.Hrm.overtime")

  return (
    <div className="flex flex-wrap items-center gap-2">
      <ExceptionDecisionButton
        exceptionId={exceptionId}
        action={approveOtmExceptionAction}
        label={t("exceptionApprove")}
        pendingLabel={t("exceptionApproving")}
        variant="outline"
      />
      <ExceptionDecisionButton
        exceptionId={exceptionId}
        action={rejectOtmExceptionAction}
        label={t("exceptionReject")}
        pendingLabel={t("exceptionRejecting")}
        variant="destructive"
      />
    </div>
  )
}

function ExceptionDecisionButton({
  exceptionId,
  action,
  label,
  pendingLabel,
  variant,
}: {
  exceptionId: string
  action: (
    prev: OtmExceptionDecisionFormState | undefined,
    formData: FormData
  ) => Promise<OtmExceptionDecisionFormState>
  label: string
  pendingLabel: string
  variant: "outline" | "destructive"
}) {
  const [state, formAction, pending] = useActionState<
    OtmExceptionDecisionFormState | undefined,
    FormData
  >(action, undefined)

  const error = state && !state.ok ? state.errors.form : null

  return (
    <form action={formAction} className="inline-flex flex-col gap-1">
      <input type="hidden" name="exceptionId" value={exceptionId} />
      <Button type="submit" size="sm" variant={variant} disabled={pending}>
        {pending ? (
          <>
            <Loader2
              className="size-4 animate-spin"
              data-icon="inline-start"
              aria-hidden
            />
            {pendingLabel}
          </>
        ) : (
          label
        )}
      </Button>
      {error ? <FieldError>{error}</FieldError> : null}
    </form>
  )
}
