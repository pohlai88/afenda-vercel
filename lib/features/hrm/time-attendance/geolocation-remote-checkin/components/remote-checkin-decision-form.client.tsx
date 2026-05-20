"use client"

import { useActionState, useId, useState } from "react"
import { useTranslations } from "next-intl"
import { Loader2 } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "#components2/ui/alert"
import { Button } from "#components2/ui/button"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "#components2/ui/field"
import { Input } from "#components2/ui/input"
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

import { decideRemoteCheckinExceptionAction } from "../actions/remote-checkin-exception.actions"
import type { RemoteCheckinExceptionDecisionFormState } from "../../../types"

type RemoteCheckinDecisionFormProps = {
  readonly exceptionId: string
}

const EVENT_TYPES = [
  "clock_in",
  "clock_out",
  "break_start",
  "break_end",
] as const

const SELECT_CLASS =
  "h-9 w-full rounded border border-border bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-50"

export function RemoteCheckinDecisionForms({
  exceptionId,
}: RemoteCheckinDecisionFormProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <DecisionDialog exceptionId={exceptionId} decision="approve" />
      <DecisionDialog exceptionId={exceptionId} decision="reject" />
      <DecisionDialog exceptionId={exceptionId} decision="return" />
      <DecisionDialog exceptionId={exceptionId} decision="correct" />
    </div>
  )
}

function DecisionDialog({
  exceptionId,
  decision,
}: {
  exceptionId: string
  decision: "approve" | "reject" | "return" | "correct"
}) {
  const t = useTranslations("Dashboard.Hrm.Geolocation.decision")
  const tEvent = useTranslations("Dashboard.Hrm.Geolocation.eventTypeLabels")
  const [open, setOpen] = useState(false)
  const [state, formAction, pending] = useActionState<
    RemoteCheckinExceptionDecisionFormState | undefined,
    FormData
  >(async (prev, formData) => {
    const next = await decideRemoteCheckinExceptionAction(prev, formData)
    if (next?.ok) setOpen(false)
    return next
  }, undefined)
  const reasonId = useId()
  const latId = useId()
  const lngId = useId()
  const eventTypeId = useId()

  const triggerVariant =
    decision === "approve"
      ? "default"
      : decision === "correct"
        ? "secondary"
        : decision === "reject"
          ? "destructive"
          : "outline"

  const triggerLabel =
    decision === "approve"
      ? t("approveOpen")
      : decision === "reject"
        ? t("rejectOpen")
        : decision === "return"
          ? t("returnOpen")
          : t("correctOpen")

  const submitLabel =
    decision === "approve"
      ? t("approveSubmit")
      : decision === "reject"
        ? t("rejectSubmit")
        : decision === "return"
          ? t("returnSubmit")
          : t("correctSubmit")

  const submitting =
    decision === "approve"
      ? t("approving")
      : decision === "reject"
        ? t("rejecting")
        : decision === "return"
          ? t("returning")
          : t("correcting")

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant={triggerVariant}>
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{triggerLabel}</DialogTitle>
          <DialogDescription>{t("title")}</DialogDescription>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-3">
          <input type="hidden" name="exceptionId" value={exceptionId} />
          <input type="hidden" name="decision" value={decision} />

          {!state?.ok && state?.errors?.form ? (
            <Alert variant="destructive">
              <AlertTitle>{t("decisionFailedTitle")}</AlertTitle>
              <AlertDescription>{state.errors.form}</AlertDescription>
            </Alert>
          ) : null}

          <Field>
            <FieldLabel htmlFor={reasonId}>
              {t("fieldDecisionReason")}
            </FieldLabel>
            <Textarea
              id={reasonId}
              name="decisionReason"
              rows={3}
              maxLength={2000}
              required={decision !== "approve"}
            />
            {!state?.ok && state?.errors?.decisionReason ? (
              <FieldError>{state.errors.decisionReason}</FieldError>
            ) : null}
          </Field>

          {decision === "correct" ? (
            <>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor={latId}>
                    {t("fieldCorrectedLatitude")}
                  </FieldLabel>
                  <Input
                    id={latId}
                    name="correctedLatitude"
                    type="number"
                    step="0.000001"
                    inputMode="decimal"
                  />
                  {!state?.ok && state?.errors?.correctedLatitude ? (
                    <FieldError>{state.errors.correctedLatitude}</FieldError>
                  ) : null}
                </Field>
                <Field>
                  <FieldLabel htmlFor={lngId}>
                    {t("fieldCorrectedLongitude")}
                  </FieldLabel>
                  <Input
                    id={lngId}
                    name="correctedLongitude"
                    type="number"
                    step="0.000001"
                    inputMode="decimal"
                  />
                </Field>
              </div>
              <Field>
                <FieldLabel htmlFor={eventTypeId}>
                  {t("fieldCorrectedEventType")}
                </FieldLabel>
                <select
                  id={eventTypeId}
                  name="correctedEventType"
                  defaultValue=""
                  className={SELECT_CLASS}
                >
                  <option value="">—</option>
                  {EVENT_TYPES.map((option) => (
                    <option key={option} value={option}>
                      {tEvent(option)}
                    </option>
                  ))}
                </select>
              </Field>
              <FieldDescription>
                {/* prompt operators to provide a reason */}
                {t("fieldDecisionReason")}
              </FieldDescription>
            </>
          ) : null}

          <DialogFooter>
            <Button type="submit" disabled={pending} variant={triggerVariant}>
              {pending ? (
                <>
                  <Loader2
                    className="size-4 animate-spin"
                    data-icon="inline-start"
                    aria-hidden
                  />
                  {submitting}
                </>
              ) : (
                submitLabel
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
