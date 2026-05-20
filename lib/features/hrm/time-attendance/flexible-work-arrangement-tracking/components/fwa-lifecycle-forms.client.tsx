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
  renewFwaRequestAction,
  suspendFwaRequestAction,
  terminateFwaRequestAction,
  type FwaApprovalFormState,
} from "#features/hrm/client"

type FwaLifecycleFormsProps = {
  requestId: string
  dateRange: string
}

export function FwaLifecycleForms({
  requestId,
  dateRange,
}: FwaLifecycleFormsProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <RenewFwaDialog requestId={requestId} dateRange={dateRange} />
      <SuspendFwaDialog requestId={requestId} dateRange={dateRange} />
      <TerminateFwaDialog requestId={requestId} dateRange={dateRange} />
    </div>
  )
}

function RenewFwaDialog({
  requestId,
  dateRange,
}: {
  requestId: string
  dateRange: string
}) {
  const t = useTranslations("Dashboard.Hrm.flexibleWork")
  const startDateId = useId()
  const endDateId = useId()
  const reasonId = useId()
  const [state, formAction, pending] = useActionState<
    FwaApprovalFormState | undefined,
    FormData
  >(renewFwaRequestAction, undefined)

  const error = state && !state.ok ? state.errors : null

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" size="sm" variant="secondary">
          {t("renew")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("renewDialogTitle")}</DialogTitle>
          <DialogDescription>
            {t("renewDialogDescription", { dates: dateRange })}
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="requestId" value={requestId} />
          <Field>
            <FieldLabel htmlFor={startDateId}>{t("fieldStartDate")}</FieldLabel>
            <Input
              id={startDateId}
              name="startDate"
              type="date"
              required
              disabled={pending}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor={endDateId}>{t("fieldEndDate")}</FieldLabel>
            <Input
              id={endDateId}
              name="endDate"
              type="date"
              disabled={pending}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor={reasonId}>{t("fieldReason")}</FieldLabel>
            <Input id={reasonId} name="reason" required disabled={pending} />
          </Field>
          {error?.form || error?.requestId ? (
            <FieldError>{error.form ?? error.requestId}</FieldError>
          ) : null}
          <Button type="submit" disabled={pending}>
            {pending ? (
              <>
                <Loader2
                  className="size-4 animate-spin"
                  data-icon="inline-start"
                  aria-hidden
                />
                {t("renewing")}
              </>
            ) : (
              t("confirmRenew")
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function SuspendFwaDialog({
  requestId,
  dateRange,
}: {
  requestId: string
  dateRange: string
}) {
  const t = useTranslations("Dashboard.Hrm.flexibleWork")
  const reasonId = useId()
  const [state, formAction, pending] = useActionState<
    FwaApprovalFormState | undefined,
    FormData
  >(suspendFwaRequestAction, undefined)

  const error = state && !state.ok ? state.errors : null

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" size="sm" variant="outline">
          {t("suspend")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("suspendDialogTitle")}</DialogTitle>
          <DialogDescription>
            {t("suspendDialogDescription", { dates: dateRange })}
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="requestId" value={requestId} />
          <Field>
            <FieldLabel htmlFor={reasonId}>
              {t("fieldSuspensionReason")}
            </FieldLabel>
            <Input
              id={reasonId}
              name="suspensionReason"
              required
              disabled={pending}
            />
            {error?.form || error?.requestId ? (
              <FieldError>{error.form ?? error.requestId}</FieldError>
            ) : null}
          </Field>
          <Button type="submit" disabled={pending}>
            {pending ? (
              <>
                <Loader2
                  className="size-4 animate-spin"
                  data-icon="inline-start"
                  aria-hidden
                />
                {t("suspending")}
              </>
            ) : (
              t("confirmSuspend")
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function TerminateFwaDialog({
  requestId,
  dateRange,
}: {
  requestId: string
  dateRange: string
}) {
  const t = useTranslations("Dashboard.Hrm.flexibleWork")
  const reasonId = useId()
  const [state, formAction, pending] = useActionState<
    FwaApprovalFormState | undefined,
    FormData
  >(terminateFwaRequestAction, undefined)

  const error = state && !state.ok ? state.errors : null

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" size="sm" variant="destructive">
          {t("terminate")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("terminateDialogTitle")}</DialogTitle>
          <DialogDescription>
            {t("terminateDialogDescription", { dates: dateRange })}
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="requestId" value={requestId} />
          <Field>
            <FieldLabel htmlFor={reasonId}>
              {t("fieldTerminationReason")}
            </FieldLabel>
            <Input
              id={reasonId}
              name="terminationReason"
              required
              disabled={pending}
            />
            {error?.form || error?.requestId ? (
              <FieldError>{error.form ?? error.requestId}</FieldError>
            ) : null}
          </Field>
          <Button type="submit" variant="destructive" disabled={pending}>
            {pending ? (
              <>
                <Loader2
                  className="size-4 animate-spin"
                  data-icon="inline-start"
                  aria-hidden
                />
                {t("terminating")}
              </>
            ) : (
              t("confirmTerminate")
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
