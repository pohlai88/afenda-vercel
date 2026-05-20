"use client"

import { useActionState, useId, useState } from "react"
import { useTranslations } from "next-intl"
import { Loader2 } from "lucide-react"

import { Alert, AlertDescription } from "#components2/ui/alert"
import { Button } from "#components2/ui/button"
import { Field, FieldError, FieldLabel } from "#components2/ui/field"
import { Input } from "#components2/ui/input"

import type {
  AssignEmployeeShiftFormState,
  BulkAssignEmployeeShiftsFormState,
  SftPublishRosterFormState,
  SftRecurrenceMutationFormState,
} from "../../../types"
import {
  applyRecurrenceRuleAction,
  applyRotationCycleAction,
  assignEmployeeShiftAction,
  bulkAssignEmployeeShiftsAction,
  createRecurrenceRuleAction,
  publishShiftRosterAction,
} from "#features/hrm/client"
import { useFormSuccess } from "../../../_internal-cross-cutting/use-form-success.client"

const SELECT_CLASS =
  "h-9 w-full rounded border border-border bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-50"

export type SftEmployeeChoice = {
  readonly id: string
  readonly employeeNumber: string | null
  readonly legalName: string
}

export type SftTemplateChoice = {
  readonly id: string
  readonly code: string
  readonly name: string
}

export type SftRecurrenceRuleChoice = {
  readonly id: string
  readonly employeeName: string
  readonly templateCode: string
  readonly weekday: number
}

export type SftRotationCycleChoice = {
  readonly id: string
  readonly code: string
  readonly name: string
}

function employeeLabel(row: SftEmployeeChoice) {
  return row.employeeNumber
    ? `${row.legalName} · ${row.employeeNumber}`
    : row.legalName
}

function templateLabel(row: SftTemplateChoice) {
  return `${row.code} · ${row.name}`
}

export function SftAssignShiftForm({
  employees,
  templates,
  defaultDate,
}: {
  employees: readonly SftEmployeeChoice[]
  templates: readonly SftTemplateChoice[]
  defaultDate: string
}) {
  const t = useTranslations("Dashboard.Hrm.shiftScheduling")
  const [state, formAction, pending] = useActionState<
    AssignEmployeeShiftFormState | undefined,
    FormData
  >(assignEmployeeShiftAction, undefined)

  const employeeFieldId = useId()
  const dateFieldId = useId()
  const templateFieldId = useId()
  const errors = state && !state.ok ? state.errors : null

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <Field>
        <FieldLabel htmlFor={employeeFieldId}>{t("fieldEmployee")}</FieldLabel>
        <select
          id={employeeFieldId}
          name="employeeId"
          className={SELECT_CLASS}
          required
          defaultValue=""
        >
          <option value="" disabled>
            {t("selectEmployee")}
          </option>
          {employees.map((row) => (
            <option key={row.id} value={row.id}>
              {employeeLabel(row)}
            </option>
          ))}
        </select>
        {errors?.employeeId ? (
          <FieldError>{errors.employeeId}</FieldError>
        ) : null}
      </Field>
      <Field>
        <FieldLabel htmlFor={dateFieldId}>
          {t("fieldAttendanceDate")}
        </FieldLabel>
        <Input
          id={dateFieldId}
          name="attendanceDate"
          type="date"
          required
          defaultValue={defaultDate}
        />
        {errors?.attendanceDate ? (
          <FieldError>{errors.attendanceDate}</FieldError>
        ) : null}
      </Field>
      <Field>
        <FieldLabel htmlFor={templateFieldId}>
          {t("fieldShiftTemplate")}
        </FieldLabel>
        <select
          id={templateFieldId}
          name="shiftTemplateId"
          className={SELECT_CLASS}
          required
          defaultValue=""
        >
          <option value="" disabled>
            {t("selectShiftTemplate")}
          </option>
          {templates.map((row) => (
            <option key={row.id} value={row.id}>
              {templateLabel(row)}
            </option>
          ))}
        </select>
        {errors?.shiftTemplateId ? (
          <FieldError>{errors.shiftTemplateId}</FieldError>
        ) : null}
      </Field>
      {errors?.form ? (
        <Alert variant="destructive">
          <AlertDescription>{errors.form}</AlertDescription>
        </Alert>
      ) : null}
      {state?.ok ? (
        <p className="text-xs text-muted-foreground">{t("assignSuccess")}</p>
      ) : null}
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? (
          <>
            <Loader2 className="size-4 animate-spin" data-icon="inline-start" />
            {t("assignSubmitting")}
          </>
        ) : (
          t("assignSubmit")
        )}
      </Button>
    </form>
  )
}

export function SftBulkAssignForm({
  employees,
  templates,
  rangeStart,
  rangeEnd,
}: {
  employees: readonly SftEmployeeChoice[]
  templates: readonly SftTemplateChoice[]
  rangeStart: string
  rangeEnd: string
}) {
  const t = useTranslations("Dashboard.Hrm.shiftScheduling")
  const [state, formAction, pending] = useActionState<
    BulkAssignEmployeeShiftsFormState | undefined,
    FormData
  >(bulkAssignEmployeeShiftsAction, undefined)

  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const rangeStartId = useId()
  const rangeEndId = useId()
  const templateFieldId = useId()
  const errors = state && !state.ok ? state.errors : null

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <Field>
        <FieldLabel>{t("fieldEmployees")}</FieldLabel>
        <div className="max-h-40 overflow-y-auto rounded border border-border p-2">
          {employees.map((row) => (
            <label
              key={row.id}
              className="flex cursor-pointer items-center gap-2 py-1 text-sm"
            >
              <input
                type="checkbox"
                checked={selectedIds.includes(row.id)}
                onChange={(event) => {
                  setSelectedIds((prev) =>
                    event.target.checked
                      ? [...prev, row.id]
                      : prev.filter((id) => id !== row.id)
                  )
                }}
              />
              {employeeLabel(row)}
            </label>
          ))}
        </div>
        <input type="hidden" name="employeeIds" value={selectedIds.join(",")} />
        {errors?.employeeIds ? (
          <FieldError>{errors.employeeIds}</FieldError>
        ) : null}
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor={rangeStartId}>{t("fieldRangeStart")}</FieldLabel>
          <Input
            id={rangeStartId}
            name="rangeStart"
            type="date"
            required
            defaultValue={rangeStart}
          />
          {errors?.rangeStart ? (
            <FieldError>{errors.rangeStart}</FieldError>
          ) : null}
        </Field>
        <Field>
          <FieldLabel htmlFor={rangeEndId}>{t("fieldRangeEnd")}</FieldLabel>
          <Input
            id={rangeEndId}
            name="rangeEnd"
            type="date"
            required
            defaultValue={rangeEnd}
          />
          {errors?.rangeEnd ? <FieldError>{errors.rangeEnd}</FieldError> : null}
        </Field>
      </div>
      <Field>
        <FieldLabel htmlFor={templateFieldId}>
          {t("fieldShiftTemplate")}
        </FieldLabel>
        <select
          id={templateFieldId}
          name="shiftTemplateId"
          className={SELECT_CLASS}
          required
          defaultValue=""
        >
          <option value="" disabled>
            {t("selectShiftTemplate")}
          </option>
          {templates.map((row) => (
            <option key={row.id} value={row.id}>
              {templateLabel(row)}
            </option>
          ))}
        </select>
        {errors?.shiftTemplateId ? (
          <FieldError>{errors.shiftTemplateId}</FieldError>
        ) : null}
      </Field>
      {errors?.form ? (
        <Alert variant="destructive">
          <AlertDescription>{errors.form}</AlertDescription>
        </Alert>
      ) : null}
      {state?.ok ? (
        <p className="text-xs text-muted-foreground">
          {t("bulkAssignSuccess", {
            applied: state.applied,
            skipped: state.skipped,
          })}
        </p>
      ) : null}
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? (
          <>
            <Loader2 className="size-4 animate-spin" data-icon="inline-start" />
            {t("bulkAssignSubmitting")}
          </>
        ) : (
          t("bulkAssignSubmit")
        )}
      </Button>
    </form>
  )
}

export function SftPublishRosterForm({
  rangeStart,
  rangeEnd,
}: {
  rangeStart: string
  rangeEnd: string
}) {
  const t = useTranslations("Dashboard.Hrm.shiftScheduling")
  const [state, formAction, pending] = useActionState<
    SftPublishRosterFormState | undefined,
    FormData
  >(publishShiftRosterAction, undefined)

  const periodStartId = useId()
  const periodEndId = useId()
  const noteId = useId()
  const errors = state && !state.ok ? state.errors : null

  useFormSuccess(state, undefined)

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor={periodStartId}>
            {t("fieldPeriodStart")}
          </FieldLabel>
          <Input
            id={periodStartId}
            name="periodStart"
            type="date"
            required
            defaultValue={rangeStart}
          />
          {errors?.periodStart ? (
            <FieldError>{errors.periodStart}</FieldError>
          ) : null}
        </Field>
        <Field>
          <FieldLabel htmlFor={periodEndId}>{t("fieldPeriodEnd")}</FieldLabel>
          <Input
            id={periodEndId}
            name="periodEnd"
            type="date"
            required
            defaultValue={rangeEnd}
          />
          {errors?.periodEnd ? (
            <FieldError>{errors.periodEnd}</FieldError>
          ) : null}
        </Field>
      </div>
      <Field>
        <FieldLabel htmlFor={noteId}>{t("fieldPublishNote")}</FieldLabel>
        <Input id={noteId} name="note" maxLength={500} />
      </Field>
      {errors?.form ? (
        <Alert variant="destructive">
          <AlertDescription>{errors.form}</AlertDescription>
        </Alert>
      ) : null}
      {state?.ok ? (
        <p className="text-xs text-muted-foreground">{t("publishSuccess")}</p>
      ) : null}
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? (
          <>
            <Loader2 className="size-4 animate-spin" data-icon="inline-start" />
            {t("publishSubmitting")}
          </>
        ) : (
          t("publishSubmit")
        )}
      </Button>
    </form>
  )
}

const WEEKDAY_INDICES = [0, 1, 2, 3, 4, 5, 6] as const
const WEEKDAY_MESSAGE_KEYS = [
  "weekdaySun",
  "weekdayMon",
  "weekdayTue",
  "weekdayWed",
  "weekdayThu",
  "weekdayFri",
  "weekdaySat",
] as const

export function SftCreateRecurrenceRuleForm({
  employees,
  templates,
  defaultStartDate,
}: {
  employees: readonly SftEmployeeChoice[]
  templates: readonly SftTemplateChoice[]
  defaultStartDate: string
}) {
  const t = useTranslations("Dashboard.Hrm.shiftScheduling")
  const [state, formAction, pending] = useActionState<
    SftRecurrenceMutationFormState | undefined,
    FormData
  >(createRecurrenceRuleAction, undefined)

  const employeeFieldId = useId()
  const templateFieldId = useId()
  const weekdayFieldId = useId()
  const startDateId = useId()
  const endDateId = useId()
  const errors = state && !state.ok ? state.errors : null

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <Field>
        <FieldLabel htmlFor={employeeFieldId}>{t("fieldEmployee")}</FieldLabel>
        <select
          id={employeeFieldId}
          name="employeeId"
          className={SELECT_CLASS}
          required
          defaultValue=""
        >
          <option value="" disabled>
            {t("selectEmployee")}
          </option>
          {employees.map((row) => (
            <option key={row.id} value={row.id}>
              {employeeLabel(row)}
            </option>
          ))}
        </select>
      </Field>
      <Field>
        <FieldLabel htmlFor={templateFieldId}>
          {t("fieldShiftTemplate")}
        </FieldLabel>
        <select
          id={templateFieldId}
          name="shiftTemplateId"
          className={SELECT_CLASS}
          required
          defaultValue=""
        >
          <option value="" disabled>
            {t("selectShiftTemplate")}
          </option>
          {templates.map((row) => (
            <option key={row.id} value={row.id}>
              {templateLabel(row)}
            </option>
          ))}
        </select>
      </Field>
      <Field>
        <FieldLabel htmlFor={weekdayFieldId}>{t("fieldWeekday")}</FieldLabel>
        <select
          id={weekdayFieldId}
          name="weekday"
          className={SELECT_CLASS}
          required
          defaultValue="1"
        >
          {WEEKDAY_INDICES.map((index) => (
            <option key={index} value={String(index)}>
              {t(WEEKDAY_MESSAGE_KEYS[index])}
            </option>
          ))}
        </select>
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor={startDateId}>
            {t("fieldRecurrenceStart")}
          </FieldLabel>
          <Input
            id={startDateId}
            name="startDate"
            type="date"
            required
            defaultValue={defaultStartDate}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor={endDateId}>{t("fieldRecurrenceEnd")}</FieldLabel>
          <Input id={endDateId} name="endDate" type="date" />
          <p className="text-xs text-muted-foreground">
            {t("fieldRecurrenceEndHint")}
          </p>
        </Field>
      </div>
      {errors?.form ? (
        <Alert variant="destructive">
          <AlertDescription>{errors.form}</AlertDescription>
        </Alert>
      ) : null}
      {state?.ok ? (
        <p className="text-xs text-muted-foreground">
          {t("recurrenceCreateSuccess")}
        </p>
      ) : null}
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? (
          <>
            <Loader2 className="size-4 animate-spin" data-icon="inline-start" />
            {t("recurrenceCreateSubmitting")}
          </>
        ) : (
          t("recurrenceCreateSubmit")
        )}
      </Button>
    </form>
  )
}

export function SftApplyRecurrenceForm({
  rules,
  rangeStart,
  rangeEnd,
}: {
  rules: readonly SftRecurrenceRuleChoice[]
  rangeStart: string
  rangeEnd: string
}) {
  const t = useTranslations("Dashboard.Hrm.shiftScheduling")
  const [state, formAction, pending] = useActionState<
    SftRecurrenceMutationFormState | undefined,
    FormData
  >(applyRecurrenceRuleAction, undefined)

  const ruleId = useId()
  const rangeStartFieldId = useId()
  const rangeEndFieldId = useId()
  const errors = state && !state.ok ? state.errors : null

  const weekdayLabels = [
    t("weekdaySun"),
    t("weekdayMon"),
    t("weekdayTue"),
    t("weekdayWed"),
    t("weekdayThu"),
    t("weekdayFri"),
    t("weekdaySat"),
  ] as const

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <Field>
        <FieldLabel htmlFor={ruleId}>{t("fieldRecurrenceRule")}</FieldLabel>
        <select
          id={ruleId}
          name="ruleId"
          className={SELECT_CLASS}
          required
          defaultValue=""
        >
          <option value="" disabled>
            {t("selectRecurrenceRule")}
          </option>
          {rules.map((row) => (
            <option key={row.id} value={row.id}>
              {row.employeeName} · {row.templateCode} ·{" "}
              {weekdayLabels[row.weekday] ?? String(row.weekday)}
            </option>
          ))}
        </select>
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor={rangeStartFieldId}>
            {t("fieldRangeStart")}
          </FieldLabel>
          <Input
            id={rangeStartFieldId}
            name="rangeStart"
            type="date"
            required
            defaultValue={rangeStart}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor={rangeEndFieldId}>
            {t("fieldRangeEnd")}
          </FieldLabel>
          <Input
            id={rangeEndFieldId}
            name="rangeEnd"
            type="date"
            required
            defaultValue={rangeEnd}
          />
        </Field>
      </div>
      {errors?.form ? (
        <Alert variant="destructive">
          <AlertDescription>{errors.form}</AlertDescription>
        </Alert>
      ) : null}
      {state?.ok ? (
        <p className="text-xs text-muted-foreground">
          {t("recurrenceApplySuccess", {
            applied: state.applied,
            skipped: state.skipped,
          })}
        </p>
      ) : null}
      <Button type="submit" size="sm" disabled={pending || rules.length === 0}>
        {pending ? (
          <>
            <Loader2 className="size-4 animate-spin" data-icon="inline-start" />
            {t("recurrenceApplySubmitting")}
          </>
        ) : (
          t("recurrenceApplySubmit")
        )}
      </Button>
    </form>
  )
}

export function SftApplyRotationForm({
  employees,
  rotationCycles,
  rangeStart,
  rangeEnd,
}: {
  employees: readonly SftEmployeeChoice[]
  rotationCycles: readonly SftRotationCycleChoice[]
  rangeStart: string
  rangeEnd: string
}) {
  const t = useTranslations("Dashboard.Hrm.shiftScheduling")
  const [state, formAction, pending] = useActionState<
    SftRecurrenceMutationFormState | undefined,
    FormData
  >(applyRotationCycleAction, undefined)

  const cycleId = useId()
  const employeeId = useId()
  const errors = state && !state.ok ? state.errors : null

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <Field>
        <FieldLabel htmlFor={cycleId}>{t("fieldRotationCycle")}</FieldLabel>
        <select
          id={cycleId}
          name="rotationCycleId"
          className={SELECT_CLASS}
          required
          defaultValue=""
        >
          <option value="" disabled>
            {t("selectRotationCycle")}
          </option>
          {rotationCycles.map((row) => (
            <option key={row.id} value={row.id}>
              {row.code} · {row.name}
            </option>
          ))}
        </select>
      </Field>
      <Field>
        <FieldLabel htmlFor={employeeId}>{t("fieldEmployee")}</FieldLabel>
        <select
          id={employeeId}
          name="employeeId"
          className={SELECT_CLASS}
          required
          defaultValue=""
        >
          <option value="" disabled>
            {t("selectEmployee")}
          </option>
          {employees.map((row) => (
            <option key={row.id} value={row.id}>
              {employeeLabel(row)}
            </option>
          ))}
        </select>
      </Field>
      <input type="hidden" name="rangeStart" value={rangeStart} />
      <input type="hidden" name="rangeEnd" value={rangeEnd} />
      {errors?.form ? (
        <Alert variant="destructive">
          <AlertDescription>{errors.form}</AlertDescription>
        </Alert>
      ) : null}
      {state?.ok ? (
        <p className="text-xs text-muted-foreground">
          {t("rotationApplySuccess", {
            applied: state.applied,
            skipped: state.skipped,
          })}
        </p>
      ) : null}
      <Button
        type="submit"
        size="sm"
        disabled={pending || rotationCycles.length === 0}
      >
        {pending ? (
          <>
            <Loader2 className="size-4 animate-spin" data-icon="inline-start" />
            {t("rotationApplySubmitting")}
          </>
        ) : (
          t("rotationApplySubmit")
        )}
      </Button>
    </form>
  )
}
