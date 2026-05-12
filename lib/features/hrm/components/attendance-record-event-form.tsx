"use client"

import {
  useActionState,
  useEffect,
  useId,
  useMemo,
  useRef,
} from "react"
import { useTranslations } from "next-intl"
import { Loader2 } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "#components/ui/alert"
import { Button } from "#components/ui/button"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "#components/ui/field"
import { Input } from "#components/ui/input"

import {
  recordAttendanceEventAction,
  type AttendanceRecordFormState,
} from "#features/hrm/client"

import { ATTENDANCE_MANUAL_EVENT_TYPES } from "../data/attendance-display.shared"
import type { AttendanceEmployeeChoiceRow } from "../data/attendance.queries.server"

type AttendanceRecordEventFormProps = {
  orgSlug: string
  employees: AttendanceEmployeeChoiceRow[]
  onSuccess?: () => void
}

const SELECT_CLASS =
  "h-9 w-full rounded border border-border bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-50"

/**
 * Record-attendance-event form body.
 *
 * Lives outside the dialog wrapper so the cross-boundary `onSuccess`
 * callback (which closes the parent dialog) reads as a normal function
 * to ESLint, not a `setState`-in-effect anti-pattern. Mirrors the
 * established `LeaveApplyForm` shape.
 */
export function AttendanceRecordEventForm({
  orgSlug,
  employees,
  onSuccess,
}: AttendanceRecordEventFormProps) {
  const t = useTranslations("Dashboard.Hrm.attendance")
  const [state, formAction, pending] = useActionState<
    AttendanceRecordFormState | undefined,
    FormData
  >(recordAttendanceEventAction, undefined)

  const employeeFieldId = useId()
  const eventTypeId = useId()
  const occurredAtId = useId()
  const deviceFieldId = useId()

  const onSuccessRef = useRef(onSuccess)
  useEffect(() => {
    onSuccessRef.current = onSuccess
  }, [onSuccess])

  useEffect(() => {
    if (state?.ok) {
      onSuccessRef.current?.()
    }
  }, [state])

  const fieldErrors = useMemo(() => {
    if (!state || state.ok) return null
    return state.errors
  }, [state])

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="orgSlug" value={orgSlug} />

      {fieldErrors?.form ? (
        <Alert variant="destructive">
          <AlertTitle>{t("errorTitle")}</AlertTitle>
          <AlertDescription>{fieldErrors.form}</AlertDescription>
        </Alert>
      ) : null}

      <Field data-invalid={fieldErrors?.employeeId ? true : undefined}>
        <FieldLabel htmlFor={employeeFieldId}>{t("fieldEmployee")}</FieldLabel>
        <select
          id={employeeFieldId}
          name="employeeId"
          required
          defaultValue=""
          className={SELECT_CLASS}
          aria-invalid={Boolean(fieldErrors?.employeeId)}
        >
          <option value="" disabled>
            {t("fieldEmployeePlaceholder")}
          </option>
          {employees.map((employee) => (
            <option key={employee.id} value={employee.id}>
              {employee.legalName} · {employee.employeeNumber}
            </option>
          ))}
        </select>
        {fieldErrors?.employeeId ? (
          <FieldError>{fieldErrors.employeeId}</FieldError>
        ) : null}
      </Field>

      <Field data-invalid={fieldErrors?.eventType ? true : undefined}>
        <FieldLabel htmlFor={eventTypeId}>{t("fieldEventType")}</FieldLabel>
        <select
          id={eventTypeId}
          name="eventType"
          required
          defaultValue="clock_in"
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
          aria-invalid={Boolean(fieldErrors?.occurredAt)}
        />
        <FieldDescription>{t("fieldOccurredAtHint")}</FieldDescription>
        {fieldErrors?.occurredAt ? (
          <FieldError>{fieldErrors.occurredAt}</FieldError>
        ) : null}
      </Field>

      <Field>
        <FieldLabel htmlFor={deviceFieldId}>{t("fieldDeviceId")}</FieldLabel>
        <Input
          id={deviceFieldId}
          name="deviceId"
          type="text"
          maxLength={120}
          placeholder={t("fieldDeviceIdPlaceholder")}
        />
      </Field>

      <Button type="submit" disabled={pending} className="self-start">
        {pending ? (
          <>
            <Loader2
              className="size-4 animate-spin"
              data-icon="inline-start"
              aria-hidden
            />
            {t("recordSubmitting")}
          </>
        ) : (
          t("recordSubmit")
        )}
      </Button>
    </form>
  )
}
