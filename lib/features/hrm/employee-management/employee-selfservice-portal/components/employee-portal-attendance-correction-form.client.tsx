"use client"

import { useActionState, useEffect, useId, useMemo, useRef } from "react"
import { useRouter } from "#i18n/navigation"
import { Loader2 } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "#components2/ui/alert"
import { Button } from "#components2/ui/button"
import { Field, FieldError, FieldLabel } from "#components2/ui/field"
import { Input } from "#components2/ui/input"
import {
  requestPortalEmployeeAttendanceCorrectionAction,
  type AttendanceCorrectionFormState,
} from "#features/hrm/client"

import { useTranslations } from "next-intl"

import { ATTENDANCE_EVENT_TYPES } from "../../../time-attendance/leave-attendance-management/schemas/attendance-event.schema"

type CorrectableAttendanceEvent = {
  readonly id: string
  readonly eventType: string
  readonly occurredAt: Date
  readonly correctionOfEventId: string | null
}

type EmployeePortalAttendanceCorrectionFormProps = {
  portalSlug: string
  events: ReadonlyArray<CorrectableAttendanceEvent>
}

export function EmployeePortalAttendanceCorrectionForm({
  portalSlug,
  events,
}: EmployeePortalAttendanceCorrectionFormProps) {
  const t = useTranslations("Dashboard.Hrm.portalAttendance")
  const router = useRouter()
  const [state, formAction, pending] = useActionState<
    AttendanceCorrectionFormState | undefined,
    FormData
  >(requestPortalEmployeeAttendanceCorrectionAction, undefined)

  const selectId = useId()
  const eventTypeId = useId()
  const occurredAtId = useId()
  const reasonId = useId()

  const refreshed = useRef(false)
  useEffect(() => {
    if (state?.ok && !refreshed.current) {
      refreshed.current = true
      router.refresh()
    }
  }, [state, router])

  const fieldErrors = useMemo(() => {
    if (!state || state.ok) return null
    return state.errors
  }, [state])

  const correctable = events.filter((e) => e.correctionOfEventId === null)

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="portalSlug" value={portalSlug} />

      {fieldErrors?.form ? (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{fieldErrors.form}</AlertDescription>
        </Alert>
      ) : null}

      <Field>
        <FieldLabel htmlFor={selectId}>{t("correctionsTitle")}</FieldLabel>
        <select
          id={selectId}
          name="originalEventId"
          required
          className="h-9 w-full rounded border border-border bg-background px-2 text-sm"
          defaultValue=""
        >
          <option value="" disabled>
            Select eventÔÇª
          </option>
          {correctable.map((ev) => (
            <option key={ev.id} value={ev.id}>
              {ev.eventType} ┬À {ev.occurredAt.toISOString()}
            </option>
          ))}
        </select>
        {fieldErrors?.originalEventId ? (
          <FieldError>{fieldErrors.originalEventId}</FieldError>
        ) : null}
      </Field>

      <Field>
        <FieldLabel htmlFor={eventTypeId}>Corrected type</FieldLabel>
        <select
          id={eventTypeId}
          name="eventType"
          required
          className="h-9 w-full rounded border border-border bg-background px-2 text-sm"
          defaultValue="clock_in"
        >
          {ATTENDANCE_EVENT_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
        {fieldErrors?.eventType ? (
          <FieldError>{fieldErrors.eventType}</FieldError>
        ) : null}
      </Field>

      <Field>
        <FieldLabel htmlFor={occurredAtId}>
          Corrected time (ISO-8601)
        </FieldLabel>
        <Input
          id={occurredAtId}
          name="occurredAt"
          required
          className="h-9"
          placeholder="2026-05-11T09:00:00.000Z"
        />
        {fieldErrors?.occurredAt ? (
          <FieldError>{fieldErrors.occurredAt}</FieldError>
        ) : null}
      </Field>

      <Field>
        <FieldLabel htmlFor={reasonId}>Reason</FieldLabel>
        <Input id={reasonId} name="correctionReason" required className="h-9" />
        {fieldErrors?.correctionReason ? (
          <FieldError>{fieldErrors.correctionReason}</FieldError>
        ) : null}
      </Field>

      <p className="text-xs text-muted-foreground">{t("correctionHint")}</p>

      <Button type="submit" disabled={pending || correctable.length === 0}>
        {pending ? (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
            ÔÇª
          </>
        ) : (
          "Submit correction"
        )}
      </Button>
    </form>
  )
}
