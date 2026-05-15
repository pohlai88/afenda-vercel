"use client"

import {
  useActionState,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
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
  applyLeaveOnBehalfAction,
  type LeaveRequestMutationFormState,
} from "#features/hrm/client"

import { LEAVE_HALF_DAY_OPTIONS } from "../data/leave-display.shared"
import type {
  LeaveEmployeeChoiceRow,
  LeaveTypeChoiceRow,
} from "../data/leave-request.queries.server"

type LeaveApplyFormProps = {
  orgSlug: string
  employees: LeaveEmployeeChoiceRow[]
  leaveTypes: LeaveTypeChoiceRow[]
  onSuccess?: () => void
}

const SELECT_CLASS =
  "h-9 w-full rounded border border-border bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-50"

/**
 * Apply-leave form body.
 *
 * Lives outside the dialog wrapper so the cross-boundary `onSuccess`
 * callback (which closes the parent dialog) reads as a normal function
 * to ESLint, not a `setState`-in-effect anti-pattern. Mirrors the
 * established `EmployeeCreateForm` shape.
 */
export function LeaveApplyForm({
  orgSlug,
  employees,
  leaveTypes,
  onSuccess,
}: LeaveApplyFormProps) {
  const t = useTranslations("Dashboard.Hrm.leave")
  const [halfDay, setHalfDay] =
    useState<(typeof LEAVE_HALF_DAY_OPTIONS)[number]>("none")
  const [state, formAction, pending] = useActionState<
    LeaveRequestMutationFormState | undefined,
    FormData
  >(applyLeaveOnBehalfAction, undefined)

  const employeeId = useId()
  const leaveTypeId = useId()
  const startDateId = useId()
  const endDateId = useId()
  const durationId = useId()
  const durationOverrideReasonId = useId()
  const halfDayId = useId()
  const reasonId = useId()

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
        <FieldLabel htmlFor={employeeId}>{t("fieldEmployee")}</FieldLabel>
        <select
          id={employeeId}
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

      <div className="grid gap-3 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor={halfDayId}>{t("fieldHalfDay")}</FieldLabel>
          <select
            id={halfDayId}
            name="halfDay"
            value={halfDay}
            onChange={(event) =>
              setHalfDay(
                event.target.value as (typeof LEAVE_HALF_DAY_OPTIONS)[number]
              )
            }
            className={SELECT_CLASS}
          >
            {LEAVE_HALF_DAY_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {t(`halfDay.${option}`)}
              </option>
            ))}
          </select>
        </Field>
        <Field data-invalid={fieldErrors?.durationDays ? true : undefined}>
          <FieldLabel htmlFor={durationId}>
            {t("fieldDurationOverride")}
          </FieldLabel>
          <Input
            id={durationId}
            name="durationDays"
            type="number"
            min="0.5"
            max="365"
            step="0.5"
            placeholder="Auto"
            aria-invalid={Boolean(fieldErrors?.durationDays)}
          />
          <FieldDescription>{t("fieldDurationHint")}</FieldDescription>
          {fieldErrors?.durationDays ? (
            <FieldError>{fieldErrors.durationDays}</FieldError>
          ) : null}
        </Field>
      </div>

      <Field
        data-invalid={fieldErrors?.durationOverrideReason ? true : undefined}
      >
        <FieldLabel htmlFor={durationOverrideReasonId}>
          {t("fieldDurationOverrideReason")}
        </FieldLabel>
        <Input
          id={durationOverrideReasonId}
          name="durationOverrideReason"
          maxLength={1000}
          placeholder={t("fieldDurationOverrideReasonPlaceholder")}
          aria-invalid={Boolean(fieldErrors?.durationOverrideReason)}
        />
        {fieldErrors?.durationOverrideReason ? (
          <FieldError>{fieldErrors.durationOverrideReason}</FieldError>
        ) : null}
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
            {t("applySubmitting")}
          </>
        ) : (
          t("applySubmit")
        )}
      </Button>
    </form>
  )
}
