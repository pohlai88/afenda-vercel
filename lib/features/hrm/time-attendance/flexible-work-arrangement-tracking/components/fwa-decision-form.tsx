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
  approveFwaRequestAction,
  rejectFwaRequestAction,
  returnFwaRequestAction,
  type FwaApprovalFormState,
} from "#features/hrm/client"

type FwaDecisionFormsProps = {
  requestId: string
  dateRange: string
}

export function FwaDecisionForms({
  requestId,
  dateRange,
}: FwaDecisionFormsProps) {
  return (
    <div className="flex items-center gap-2">
      <ApproveFwaButton requestId={requestId} dateRange={dateRange} />
      <ReturnFwaDialog requestId={requestId} dateRange={dateRange} />
      <RejectFwaDialog requestId={requestId} dateRange={dateRange} />
    </div>
  )
}

function ApproveFwaButton({
  requestId,
  dateRange,
}: {
  requestId: string
  dateRange: string
}) {
  const t = useTranslations("Dashboard.Hrm.flexibleWork")
  const [state, formAction, pending] = useActionState<
    FwaApprovalFormState | undefined,
    FormData
  >(approveFwaRequestAction, undefined)

  const error = state && !state.ok ? state.errors : null

  return (
    <form
      action={formAction}
      className="inline-flex items-center gap-2"
      aria-label={t("approveAria", { dates: dateRange })}
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

function ReturnFwaDialog({
  requestId,
  dateRange,
}: {
  requestId: string
  dateRange: string
}) {
  const t = useTranslations("Dashboard.Hrm.flexibleWork")

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost">
          {t("return")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("returnDialogTitle")}</DialogTitle>
          <DialogDescription>
            {t("returnDialogDescription", { dates: dateRange })}
          </DialogDescription>
        </DialogHeader>
        <ReturnFwaForm requestId={requestId} />
      </DialogContent>
    </Dialog>
  )
}

function ReturnFwaForm({ requestId }: { requestId: string }) {
  const t = useTranslations("Dashboard.Hrm.flexibleWork")
  const reasonId = useId()
  const [state, formAction, pending] = useActionState<
    FwaApprovalFormState | undefined,
    FormData
  >(returnFwaRequestAction, undefined)

  const error = state && !state.ok ? state.errors : null

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="requestId" value={requestId} />
      <Field>
        <FieldLabel htmlFor={reasonId}>{t("fieldReturnedReason")}</FieldLabel>
        <Input
          id={reasonId}
          name="returnedReason"
          required
          disabled={pending}
        />
        {error?.returnedReason ? (
          <FieldError>{error.returnedReason}</FieldError>
        ) : null}
      </Field>
      {error?.form ? (
        <span className="text-xs text-destructive">{error.form}</span>
      ) : null}
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? t("returning") : t("confirmReturn")}
      </Button>
    </form>
  )
}

function RejectFwaDialog({
  requestId,
  dateRange,
}: {
  requestId: string
  dateRange: string
}) {
  const t = useTranslations("Dashboard.Hrm.flexibleWork")

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost">
          {t("reject")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("rejectDialogTitle")}</DialogTitle>
          <DialogDescription>
            {t("rejectDialogDescription", { dates: dateRange })}
          </DialogDescription>
        </DialogHeader>
        <RejectFwaForm requestId={requestId} />
      </DialogContent>
    </Dialog>
  )
}

function RejectFwaForm({ requestId }: { requestId: string }) {
  const t = useTranslations("Dashboard.Hrm.flexibleWork")
  const reasonId = useId()
  const [state, formAction, pending] = useActionState<
    FwaApprovalFormState | undefined,
    FormData
  >(rejectFwaRequestAction, undefined)

  const error = state && !state.ok ? state.errors : null

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="requestId" value={requestId} />
      <Field>
        <FieldLabel htmlFor={reasonId}>{t("fieldRejectedReason")}</FieldLabel>
        <Input
          id={reasonId}
          name="rejectedReason"
          required
          disabled={pending}
        />
        {error?.rejectedReason ? (
          <FieldError>{error.rejectedReason}</FieldError>
        ) : null}
      </Field>
      {error?.form ? (
        <span className="text-xs text-destructive">{error.form}</span>
      ) : null}
      <Button type="submit" variant="destructive" disabled={pending}>
        {pending ? t("rejecting") : t("confirmReject")}
      </Button>
    </form>
  )
}
