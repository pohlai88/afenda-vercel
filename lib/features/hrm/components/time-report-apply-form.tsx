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
import { Field, FieldError, FieldLabel } from "#components/ui/field"
import { Input } from "#components/ui/input"

import {
  submitTimeReportAction,
  type TimeReportMutationFormState,
} from "#features/hrm/client"

import type { LeaveEmployeeChoiceRow } from "../data/leave-request.queries.server"

type TimeReportApplyFormProps = {
  orgSlug: string
  employees: LeaveEmployeeChoiceRow[]
  onSuccess?: () => void
}

const SELECT_CLASS =
  "h-9 w-full rounded border border-border bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-50"

export function TimeReportApplyForm({
  orgSlug,
  employees,
  onSuccess,
}: TimeReportApplyFormProps) {
  const t = useTranslations("Dashboard.Hrm.leave.timeReports")
  const [reportKind, setReportKind] = useState<"overtime" | "business_trip">(
    "overtime"
  )
  const [state, formAction, pending] = useActionState<
    TimeReportMutationFormState | undefined,
    FormData
  >(submitTimeReportAction, undefined)

  const employeeId = useId()
  const reportKindId = useId()
  const workDateId = useId()
  const overtimeId = useId()
  const tripStartId = useId()
  const tripEndId = useId()
  const destinationId = useId()
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

      <Field>
        <FieldLabel htmlFor={reportKindId}>{t("fieldReportKind")}</FieldLabel>
        <select
          id={reportKindId}
          name="reportKind"
          required
          value={reportKind}
          onChange={(e) =>
            setReportKind(e.target.value as "overtime" | "business_trip")
          }
          className={SELECT_CLASS}
        >
          <option value="overtime">{t("reportKindOvertime")}</option>
          <option value="business_trip">{t("reportKindTrip")}</option>
        </select>
      </Field>

      {reportKind === "overtime" ? (
        <>
          <Field data-invalid={fieldErrors?.workDate ? true : undefined}>
            <FieldLabel htmlFor={workDateId}>{t("fieldWorkDate")}</FieldLabel>
            <Input
              id={workDateId}
              name="workDate"
              type="date"
              required
              aria-invalid={Boolean(fieldErrors?.workDate)}
            />
            {fieldErrors?.workDate ? (
              <FieldError>{fieldErrors.workDate}</FieldError>
            ) : null}
          </Field>
          <Field data-invalid={fieldErrors?.overtimeMinutes ? true : undefined}>
            <FieldLabel htmlFor={overtimeId}>
              {t("fieldOvertimeMinutes")}
            </FieldLabel>
            <Input
              id={overtimeId}
              name="overtimeMinutes"
              type="number"
              min={1}
              max={44640}
              required
              aria-invalid={Boolean(fieldErrors?.overtimeMinutes)}
            />
            {fieldErrors?.overtimeMinutes ? (
              <FieldError>{fieldErrors.overtimeMinutes}</FieldError>
            ) : null}
          </Field>
        </>
      ) : (
        <>
          <Field data-invalid={fieldErrors?.tripStartDate ? true : undefined}>
            <FieldLabel htmlFor={tripStartId}>{t("fieldTripStart")}</FieldLabel>
            <Input
              id={tripStartId}
              name="tripStartDate"
              type="date"
              required
              aria-invalid={Boolean(fieldErrors?.tripStartDate)}
            />
            {fieldErrors?.tripStartDate ? (
              <FieldError>{fieldErrors.tripStartDate}</FieldError>
            ) : null}
          </Field>
          <Field data-invalid={fieldErrors?.tripEndDate ? true : undefined}>
            <FieldLabel htmlFor={tripEndId}>{t("fieldTripEnd")}</FieldLabel>
            <Input
              id={tripEndId}
              name="tripEndDate"
              type="date"
              required
              aria-invalid={Boolean(fieldErrors?.tripEndDate)}
            />
            {fieldErrors?.tripEndDate ? (
              <FieldError>{fieldErrors.tripEndDate}</FieldError>
            ) : null}
          </Field>
          <Field>
            <FieldLabel htmlFor={destinationId}>
              {t("fieldDestination")}
            </FieldLabel>
            <Input
              id={destinationId}
              name="destination"
              maxLength={500}
              placeholder={t("fieldDestinationPlaceholder")}
            />
          </Field>
        </>
      )}

      <Field>
        <FieldLabel htmlFor={reasonId}>{t("fieldReason")}</FieldLabel>
        <textarea
          id={reasonId}
          name="reason"
          rows={2}
          maxLength={2000}
          placeholder={t("fieldReasonPlaceholder")}
          className="min-h-[60px] w-full rounded border border-border bg-background px-2 py-1.5 text-sm focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
        />
      </Field>

      <Button type="submit" disabled={pending}>
        {pending ? (
          <>
            <Loader2
              className="size-4 animate-spin"
              data-icon="inline-start"
              aria-hidden
            />
            {t("submitting")}
          </>
        ) : (
          t("submit")
        )}
      </Button>
    </form>
  )
}
