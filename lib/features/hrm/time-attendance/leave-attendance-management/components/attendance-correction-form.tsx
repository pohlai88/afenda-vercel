"use client"

import { useActionState, useId, useMemo } from "react"
import { useTranslations } from "next-intl"
import { Loader2 } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "#components2/ui/alert"
import { Button } from "#components2/ui/button"
import { DialogFooter } from "#components2/ui/dialog"
import { Field, FieldError, FieldLabel } from "#components2/ui/field"
import { Input } from "#components2/ui/input"

import { useFormSuccess } from "../../../_internal-cross-cutting/use-form-success.client"

import {
  correctAttendanceEventAction,
  type AttendanceCorrectionFormState,
} from "#features/hrm/client"

import {
  ATTENDANCE_MANUAL_EVENT_TYPES,
  isAttendanceManualEventType,
} from "../data/attendance-display.shared"

type AttendanceCorrectionFormProps = {
  originalEventId: string
  occurredAtIso: string
  eventType: string
  onSuccess?: () => void
}

const SELECT_CLASS =
  "h-9 w-full rounded border border-border bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-50"

/**
 * Convert an ISO datetime string to the value shape that
 * `<input type="datetime-local">` requires (YYYY-MM-DDTHH:mm). Drops
 * the trailing seconds + timezone so the browser does not reject the
 * default value.
 */
function isoToLocalDatetimeValue(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ""
  const pad = (n: number) => String(n).padStart(2, "0")
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  )
}

/**
 * Correction form body. Lives outside the dialog wrapper so the
 * `onSuccess` callback (parent dialog close) reads as a normal
 * function to ESLint, mirroring the leave dialogs.
 *
 * The form pre-fills the original event type + occurred-at so the
 * common case (operator nudges a single field) is one keystroke. The
 * Server Action enforces the 3-character minimum on `correctionReason`
 * — we still mark the field `required` for browser-level UX.
 */
export function AttendanceCorrectionForm({
  originalEventId,
  occurredAtIso,
  eventType,
  onSuccess,
}: AttendanceCorrectionFormProps) {
  const t = useTranslations("Dashboard.Hrm.attendance")
  const [state, formAction, pending] = useActionState<
    AttendanceCorrectionFormState | undefined,
    FormData
  >(correctAttendanceEventAction, undefined)

  const eventTypeId = useId()
  const occurredAtId = useId()
  const reasonId = useId()
  useFormSuccess(state, onSuccess)

  const fieldErrors = useMemo(() => {
    if (!state || state.ok) return null
    return state.errors
  }, [state])

  const initialEventType = isAttendanceManualEventType(eventType)
    ? eventType
    : "clock_in"
  const initialOccurredAt = isoToLocalDatetimeValue(occurredAtIso)

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="originalEventId" value={originalEventId} />

      {fieldErrors?.form ? (
        <Alert variant="destructive">
          <AlertTitle>{t("errorTitle")}</AlertTitle>
          <AlertDescription>{fieldErrors.form}</AlertDescription>
        </Alert>
      ) : null}

      <Field data-invalid={fieldErrors?.eventType ? true : undefined}>
        <FieldLabel htmlFor={eventTypeId}>{t("fieldEventType")}</FieldLabel>
        <select
          id={eventTypeId}
          name="eventType"
          required
          defaultValue={initialEventType}
          className={SELECT_CLASS}
          aria-invalid={Boolean(fieldErrors?.eventType)}
        >
          {ATTENDANCE_MANUAL_EVENT_TYPES.map((option) => (
            <option key={option} value={option}>
              {t(`eventType.${option}`)}
            </option>
          ))}
        </select>
        {fieldErrors?.eventType ? (
          <FieldError>{fieldErrors.eventType}</FieldError>
        ) : null}
      </Field>

      <Field data-invalid={fieldErrors?.occurredAt ? true : undefined}>
        <FieldLabel htmlFor={occurredAtId}>{t("fieldOccurredAt")}</FieldLabel>
        <Input
          id={occurredAtId}
          name="occurredAt"
          type="datetime-local"
          required
          defaultValue={initialOccurredAt}
          aria-invalid={Boolean(fieldErrors?.occurredAt)}
        />
        {fieldErrors?.occurredAt ? (
          <FieldError>{fieldErrors.occurredAt}</FieldError>
        ) : null}
      </Field>

      <Field data-invalid={fieldErrors?.correctionReason ? true : undefined}>
        <FieldLabel htmlFor={reasonId}>{t("fieldCorrectionReason")}</FieldLabel>
        <textarea
          id={reasonId}
          name="correctionReason"
          rows={3}
          minLength={3}
          maxLength={500}
          required
          placeholder={t("fieldCorrectionReasonPlaceholder")}
          aria-invalid={Boolean(fieldErrors?.correctionReason)}
          className="min-h-[72px] w-full rounded border border-border bg-background px-2 py-1.5 text-sm focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
        />
        {fieldErrors?.correctionReason ? (
          <FieldError>{fieldErrors.correctionReason}</FieldError>
        ) : null}
      </Field>

      <DialogFooter showCloseButton>
        <Button type="submit" disabled={pending}>
          {pending ? (
            <>
              <Loader2
                className="size-4 animate-spin"
                data-icon="inline-start"
                aria-hidden
              />
              {t("correctSubmitting")}
            </>
          ) : (
            t("correctSubmit")
          )}
        </Button>
      </DialogFooter>
    </form>
  )
}
