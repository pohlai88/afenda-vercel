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

import {
  approveOtmRequestAction,
  rejectOtmRequestAction,
  returnOtmRequestAction,
  type OtmApprovalFormState,
} from "#features/hrm/client"

type OtmDecisionFormsProps = {
  requestId: string
  timeRange: string
}

export function OtmDecisionForms({
  requestId,
  timeRange,
}: OtmDecisionFormsProps) {
  return (
    <div className="flex items-center gap-2">
      <ApproveOtmButton requestId={requestId} timeRange={timeRange} />
      <ReturnOtmDialog requestId={requestId} timeRange={timeRange} />
      <RejectOtmDialog requestId={requestId} timeRange={timeRange} />
    </div>
  )
}

function ApproveOtmButton({
  requestId,
  timeRange,
}: {
  requestId: string
  timeRange: string
}) {
  const t = useTranslations("Dashboard.Hrm.overtime")
  const [state, formAction, pending] = useActionState<
    OtmApprovalFormState | undefined,
    FormData
  >(approveOtmRequestAction, undefined)

  const error = state && !state.ok ? state.errors : null

  return (
    <form
      action={formAction}
      className="inline-flex items-center gap-2"
      aria-label={t("approveAria", { timeRange })}
    >
      <input type="hidden" name="requestId" value={requestId} />
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        {pending ? (
          <>
            <Loader2
              className="size-4 animate-spin"
              data-icon="inline-start"
              aria-hidden
            />
            {t("approving")}
          </>
        ) : (
          t("approve")
        )}
      </Button>
      {error?.form ? (
        <span className="text-xs text-destructive">{error.form}</span>
      ) : null}
    </form>
  )
}

function ReturnOtmDialog({
  requestId,
  timeRange,
}: {
  requestId: string
  timeRange: string
}) {
  const t = useTranslations("Dashboard.Hrm.overtime")
  const reasonId = useId()
  const [state, formAction, pending] = useActionState<
    OtmApprovalFormState | undefined,
    FormData
  >(returnOtmRequestAction, undefined)

  const errors = state && !state.ok ? state.errors : null

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" size="sm" variant="ghost">
          {t("return")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("returnDialogTitle")}</DialogTitle>
          <DialogDescription>
            {t("returnDialogDescription", { timeRange })}
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="requestId" value={requestId} />
          <Field>
            <FieldLabel htmlFor={reasonId}>{t("fieldReturnReason")}</FieldLabel>
            <Input id={reasonId} name="returnedReason" required />
            {errors?.returnedReason ? (
              <FieldError>{errors.returnedReason}</FieldError>
            ) : null}
          </Field>
          {errors?.form ? (
            <p className="text-sm text-destructive">{errors.form}</p>
          ) : null}
          <Button type="submit" disabled={pending}>
            {pending ? t("returning") : t("confirmReturn")}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function RejectOtmDialog({
  requestId,
  timeRange,
}: {
  requestId: string
  timeRange: string
}) {
  const t = useTranslations("Dashboard.Hrm.overtime")
  const reasonId = useId()
  const [state, formAction, pending] = useActionState<
    OtmApprovalFormState | undefined,
    FormData
  >(rejectOtmRequestAction, undefined)

  const errors = state && !state.ok ? state.errors : null

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" size="sm" variant="destructive">
          {t("reject")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("rejectDialogTitle")}</DialogTitle>
          <DialogDescription>
            {t("rejectDialogDescription", { timeRange })}
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="requestId" value={requestId} />
          <Field>
            <FieldLabel htmlFor={reasonId}>
              {t("fieldRejectReason")}
            </FieldLabel>
            <Input id={reasonId} name="rejectedReason" required />
            {errors?.rejectedReason ? (
              <FieldError>{errors.rejectedReason}</FieldError>
            ) : null}
          </Field>
          {errors?.form ? (
            <p className="text-sm text-destructive">{errors.form}</p>
          ) : null}
          <Button type="submit" variant="destructive" disabled={pending}>
            {pending ? t("rejecting") : t("confirmReject")}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
