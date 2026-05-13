"use client"

import { useId } from "react"
import { useTranslations } from "next-intl"

import { Button } from "#components/ui/button"
import { Field, FieldLabel } from "#components/ui/field"
import { Input } from "#components/ui/input"

import type { AttendanceEmployeeChoiceRow } from "../data/attendance.queries.server"

type AttendanceDaySelectorProps = {
  orgSlug: string
  employees: AttendanceEmployeeChoiceRow[]
  selectedEmployeeId: string | null
  selectedDate: string
}

const SELECT_CLASS =
  "h-9 w-full rounded border border-border bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-50"

/**
 * URL-driven employee + date picker for the attendance day-summary.
 *
 * Submits as a plain `GET` form so the resulting view is a deep link —
 * refresh and back-button produce the exact same summary. Reset clears
 * the search params via a separate anchor (no client state at all),
 * which keeps the picker free of `useEffect` / `useState` and lets it
 * stream into the page's Suspense boundary without a roundtrip.
 *
 * Server-side validation lives in the page composer (employee id must
 * appear in the active picker; date must match `YYYY-MM-DD`); this
 * component is a thin form, not a permission boundary.
 */
export function AttendanceDaySelector({
  orgSlug,
  employees,
  selectedEmployeeId,
  selectedDate,
}: AttendanceDaySelectorProps) {
  const t = useTranslations("Dashboard.Hrm.attendance")
  const employeeId = useId()
  const dateId = useId()
  const resetHref = `/o/${orgSlug}/dashboard/hrm/attendance`

  return (
    <form
      method="get"
      action={`/o/${orgSlug}/dashboard/hrm/attendance`}
      className="flex flex-wrap items-end gap-3"
    >
      <Field className="min-w-[14rem] flex-1">
        <FieldLabel htmlFor={employeeId}>{t("daySelectorEmployee")}</FieldLabel>
        <select
          id={employeeId}
          name="employeeId"
          defaultValue={selectedEmployeeId ?? ""}
          className={SELECT_CLASS}
        >
          <option value="">{t("fieldEmployeePlaceholder")}</option>
          {employees.map((employee) => (
            <option key={employee.id} value={employee.id}>
              {employee.legalName} · {employee.employeeNumber}
            </option>
          ))}
        </select>
      </Field>

      <Field className="w-[12rem]">
        <FieldLabel htmlFor={dateId}>{t("daySelectorDate")}</FieldLabel>
        <Input
          id={dateId}
          name="date"
          type="date"
          defaultValue={selectedDate}
        />
      </Field>

      <div className="flex gap-2">
        <Button type="submit" size="sm">
          {t("daySelectorSubmit")}
        </Button>
        <Button asChild type="button" size="sm" variant="ghost">
          <a href={resetHref}>{t("daySelectorReset")}</a>
        </Button>
      </div>
    </form>
  )
}
