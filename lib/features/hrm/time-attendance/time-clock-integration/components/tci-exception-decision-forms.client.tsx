"use client"

import { useActionState, useId, useState } from "react"
import { useTranslations } from "next-intl"
import { Loader2 } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "#components2/ui/alert"
import { Button } from "#components2/ui/button"
import {
  Field,
  FieldError,
  FieldLabel,
} from "#components2/ui/field"
import { Textarea } from "#components2/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "#components2/ui/dialog"

import {
  decideTimeClockPunchExceptionAction,
  type TimeClockExceptionDecisionFormState,
} from "../actions/tci-exception.actions"

export function TimeClockExceptionDecisionForms({
  exceptionId,
}: {
  exceptionId: string
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <ExceptionDecisionDialog exceptionId={exceptionId} decision="approve" />
      <ExceptionDecisionDialog exceptionId={exceptionId} decision="reject" />
    </div>
  )
}

function ExceptionDecisionDialog({
  exceptionId,
  decision,
}: {
  exceptionId: string
  decision: "approve" | "reject"
}) {
  const t = useTranslations("Dashboard.Hrm.timeClock.exceptions")
  const [open, setOpen] = useState(false)
  const [state, formAction, pending] = useActionState<
    TimeClockExceptionDecisionFormState | undefined,
    FormData
  >(async (prev, formData) => {
    const next = await decideTimeClockPunchExceptionAction(prev, formData)
    if (next?.ok) setOpen(false)
    return next
  }, undefined)
  const reasonId = useId()

  const triggerLabel =
    decision === "approve" ? t("approveOpen") : t("rejectOpen")
  const dialogTitle =
    decision === "approve" ? t("approveDialogTitle") : t("rejectDialogTitle")
  const dialogDescription =
    decision === "approve"
      ? t("approveDialogDescription")
      : t("rejectDialogDescription")

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant={decision === "approve" ? "default" : "outline"}
        >
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>{dialogDescription}</DialogDescription>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-3">
          <input type="hidden" name="exceptionId" value={exceptionId} />
          <input type="hidden" name="decision" value={decision} />
          {!state?.ok && state?.errors?.form ? (
            <Alert variant="destructive">
              <AlertTitle>{dialogTitle}</AlertTitle>
              <AlertDescription>{state.errors.form}</AlertDescription>
            </Alert>
          ) : null}
          {decision === "reject" ? (
            <Field>
              <FieldLabel htmlFor={reasonId}>{t("fieldDecisionReason")}</FieldLabel>
              <Textarea
                id={reasonId}
                name="decisionReason"
                required
                rows={3}
                maxLength={2000}
              />
              {!state?.ok && state?.errors?.decisionReason ? (
                <FieldError>{state.errors.decisionReason}</FieldError>
              ) : null}
            </Field>
          ) : null}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  {t("submitting")}
                </>
              ) : (
                triggerLabel
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
