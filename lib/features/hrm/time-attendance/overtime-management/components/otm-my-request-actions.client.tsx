"use client"

import { useActionState, useId } from "react"
import { useTranslations } from "next-intl"
import { Loader2 } from "lucide-react"

import { Button } from "#components2/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "#components2/ui/dialog"
import { Field, FieldError, FieldLabel } from "#components2/ui/field"
import { Input } from "#components2/ui/input"

import type { OtmRequestMutationFormState } from "../../../types"
import {
  cancelOwnOtmRequestAction,
  submitOtmDraftAction,
} from "../actions/otm-request.actions"

import type { HrmOtmRequestState } from "../schemas/otm.schema"

type OtmMyRequestActionsProps = {
  requestId: string
  state: HrmOtmRequestState
  timeRange: string
}

export function OtmMyRequestActions({
  requestId,
  state,
  timeRange,
}: OtmMyRequestActionsProps) {
  const t = useTranslations("Dashboard.Hrm.overtime")

  if (state === "draft") {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <SubmitDraftButton requestId={requestId} />
      </div>
    )
  }

  if (state === "submitted" || state === "returned") {
    return (
      <CancelOtmDialog
        requestId={requestId}
        timeRange={timeRange}
        ariaLabel={t("cancelRequestAria", { timeRange })}
      />
    )
  }

  return null
}

function SubmitDraftButton({ requestId }: { requestId: string }) {
  const t = useTranslations("Dashboard.Hrm.overtime")
  const [formState, formAction, pending] = useActionState<
    OtmRequestMutationFormState | undefined,
    FormData
  >(submitOtmDraftAction, undefined)

  const error = formState && !formState.ok ? formState.errors : null

  return (
    <form action={formAction} className="inline-flex items-center gap-2">
      <input type="hidden" name="requestId" value={requestId} />
      <Button type="submit" size="sm" variant="default" disabled={pending}>
        {pending ? (
          <>
            <Loader2
              className="size-4 animate-spin"
              data-icon="inline-start"
              aria-hidden
            />
            {t("submittingDraft")}
          </>
        ) : (
          t("submitDraft")
        )}
      </Button>
      {error?.form ? (
        <span className="text-xs text-destructive">{error.form}</span>
      ) : null}
    </form>
  )
}

function CancelOtmDialog({
  requestId,
  timeRange,
  ariaLabel,
}: {
  requestId: string
  timeRange: string
  ariaLabel: string
}) {
  const t = useTranslations("Dashboard.Hrm.overtime")
  const reasonId = useId()
  const [state, formAction, pending] = useActionState<
    OtmRequestMutationFormState | undefined,
    FormData
  >(cancelOwnOtmRequestAction, undefined)

  const errors = state && !state.ok ? state.errors : null

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" size="sm" variant="ghost" aria-label={ariaLabel}>
          {t("cancelRequest")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("cancelDialogTitle")}</DialogTitle>
          <DialogDescription>
            {t("cancelDialogDescription", { timeRange })}
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="requestId" value={requestId} />
          <Field>
            <FieldLabel htmlFor={reasonId}>{t("fieldCancelReason")}</FieldLabel>
            <Input id={reasonId} name="cancelReason" />
            {errors?.form ? <FieldError>{errors.form}</FieldError> : null}
          </Field>
          <Button type="submit" variant="destructive" disabled={pending}>
            {pending ? t("cancelling") : t("confirmCancel")}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
