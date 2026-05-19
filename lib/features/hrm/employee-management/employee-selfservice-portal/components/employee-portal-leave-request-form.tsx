"use client"

import { useActionState, useId, useMemo } from "react"
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
import {
  requestPortalEmployeeLeaveAction,
  type LeaveRequestMutationFormState,
} from "#features/hrm/client"

import { useFormSuccess } from "../../../_internal-cross-cutting/use-form-success.client"
import { LEAVE_HALF_DAY_OPTIONS } from "../../../time-attendance/leave-attendance-management/data/leave-display.shared"
import type { LeaveTypeChoiceRow } from "../../../time-attendance/leave-attendance-management/data/leave-request.queries.server"

type EmployeePortalLeaveRequestFormProps = {
  portalSlug: string
  leaveTypes: LeaveTypeChoiceRow[]
  onSuccess?: () => void
}

const SELECT_CLASS =
  "h-9 w-full rounded border border-border bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-50"

export function EmployeePortalLeaveRequestForm({
  portalSlug,
  leaveTypes,
  onSuccess,
}: EmployeePortalLeaveRequestFormProps) {
  const t = useTranslations("Dashboard.Hrm.leave")
  const [state, formAction, pending] = useActionState<
    LeaveRequestMutationFormState | undefined,
    FormData
  >(requestPortalEmployeeLeaveAction, undefined)

  const leaveTypeId = useId()
  const startDateId = useId()
  const endDateId = useId()
  const halfDayId = useId()
  const reasonId = useId()
  useFormSuccess(state, onSuccess)

  const fieldErrors = useMemo(() => {
    if (!state || state.ok) return null
    return state.errors
  }, [state])

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="portalSlug" value={portalSlug} />

      {fieldErrors?.form ? (
        <Alert variant="destructive">
          <AlertTitle>{t("errorTitle")}</AlertTitle>
          <AlertDescription>{fieldErrors.form}</AlertDescription>
        </Alert>
      ) : null}

      <Field data-invalid={fieldErrors?.leaveTypeId ? true : undefined}>
        <FieldLabel htmlFor={leaveTypeId}>{t("fieldLeaveType")}</FieldLabel>
        <select
          id={leaveTypeId}
          name="leaveTypeId"
          required
          defaultValue=""
          className={SELECT_CLASS}
          aria-invalid={Boolean(fieldErrors?.leaveTypeId)}
        >
          <option value="" disabled>
            {t("fieldLeaveTypePlaceholder")}
          </option>
          {leaveTypes.map((leaveType) => (
            <option key={leaveType.id} value={leaveType.id}>
              {leaveType.code}
            </option>
          ))}
        </select>
        {fieldErrors?.leaveTypeId ? (
          <FieldError>{fieldErrors.leaveTypeId}</FieldError>
        ) : null}
      </Field>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field data-invalid={fieldErrors?.startDate ? true : undefined}>
          <FieldLabel htmlFor={startDateId}>{t("fieldStartDate")}</FieldLabel>
          <Input
            id={startDateId}
            name="startDate"
            type="date"
            required
            aria-invalid={Boolean(fieldErrors?.startDate)}
          />
          {fieldErrors?.startDate ? (
            <FieldError>{fieldErrors.startDate}</FieldError>
          ) : null}
        </Field>
        <Field data-invalid={fieldErrors?.endDate ? true : undefined}>
          <FieldLabel htmlFor={endDateId}>{t("fieldEndDate")}</FieldLabel>
          <Input
            id={endDateId}
            name="endDate"
            type="date"
            required
            aria-invalid={Boolean(fieldErrors?.endDate)}
          />
          {fieldErrors?.endDate ? (
            <FieldError>{fieldErrors.endDate}</FieldError>
          ) : null}
        </Field>
      </div>

      <Field>
        <FieldLabel htmlFor={halfDayId}>{t("fieldHalfDay")}</FieldLabel>
        <select id={halfDayId} name="halfDay" className={SELECT_CLASS}>
          {LEAVE_HALF_DAY_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {t(`halfDay.${option}`)}
            </option>
          ))}
        </select>
        <FieldDescription>{t("computedDurationHint")}</FieldDescription>
      </Field>

      <Field>
        <FieldLabel htmlFor={reasonId}>{t("fieldReason")}</FieldLabel>
        <textarea
          id={reasonId}
          name="reason"
          rows={3}
          maxLength={1000}
          placeholder={t("fieldReasonPlaceholder")}
          className="min-h-[72px] w-full rounded border border-border bg-background px-2 py-1.5 text-sm focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
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
            {t("requestSubmitting")}
          </>
        ) : (
          t("requestSubmit")
        )}
      </Button>
    </form>
  )
}
