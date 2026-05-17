"use client"

import { useActionState, useId } from "react"
import { useTranslations } from "next-intl"
import { Loader2, PlusIcon } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "#components2/ui/alert"
import { Button } from "#components2/ui/button"
import { Field, FieldError, FieldLabel } from "#components2/ui/field"
import { Input } from "#components2/ui/input"

import {
  assignEmployeeShiftAction,
  createShiftTemplateAction,
  type AssignEmployeeShiftFormState,
  type CreateShiftTemplateFormState,
} from "#features/hrm/client"

import type {
  AttendanceShiftAssignmentView,
  AttendanceShiftTemplateOption,
} from "../data/attendance-shift.shared"

type AttendanceShiftAssignmentFormsProps = {
  employeeId: string
  attendanceDate: string
  templates: AttendanceShiftTemplateOption[]
  assignment: AttendanceShiftAssignmentView | null
}

const SELECT_CLASS =
  "h-9 w-full rounded border border-border bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-50"

export function AttendanceShiftAssignmentForms({
  employeeId,
  attendanceDate,
  templates,
  assignment,
}: AttendanceShiftAssignmentFormsProps) {
  const t = useTranslations("Dashboard.Hrm.attendance")
  const [assignState, assignAction, assignPending] = useActionState<
    AssignEmployeeShiftFormState | undefined,
    FormData
  >(assignEmployeeShiftAction, undefined)
  const [createState, createAction, createPending] = useActionState<
    CreateShiftTemplateFormState | undefined,
    FormData
  >(createShiftTemplateAction, undefined)

  const assignErrors =
    assignState && !assignState.ok ? assignState.errors : null
  const createErrors =
    createState && !createState.ok ? createState.errors : null
  const templateFieldId = useId()
  const codeFieldId = useId()
  const nameFieldId = useId()
  const startFieldId = useId()
  const endFieldId = useId()
  const unpaidBreakFieldId = useId()
  const paidBreakFieldId = useId()
  const lateGraceFieldId = useId()
  const earlyOutGraceFieldId = useId()
  const overtimeGraceFieldId = useId()
  const maxDurationFieldId = useId()
  const holidayBehaviorFieldId = useId()

  return (
    <>
      <form
        action={assignAction}
        className="grid gap-3 sm:grid-cols-[1fr_auto]"
      >
        <input type="hidden" name="employeeId" value={employeeId} />
        <input type="hidden" name="attendanceDate" value={attendanceDate} />
        <Field data-invalid={assignErrors?.shiftTemplateId ? true : undefined}>
          <FieldLabel htmlFor={templateFieldId}>
            {t("shiftTemplateLabel")}
          </FieldLabel>
          <select
            id={templateFieldId}
            name="shiftTemplateId"
            required
            defaultValue={assignment?.shiftTemplateId ?? ""}
            className={SELECT_CLASS}
            disabled={templates.length === 0 || assignPending}
            aria-invalid={Boolean(assignErrors?.shiftTemplateId)}
          >
            <option value="" disabled>
              {templates.length === 0
                ? t("shiftNoTemplates")
                : t("shiftTemplatePlaceholder")}
            </option>
            {templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.code} · {template.name} · {template.defaultStartTime}-
                {template.defaultEndTime}
              </option>
            ))}
          </select>
          {assignErrors?.shiftTemplateId ? (
            <FieldError>{assignErrors.shiftTemplateId}</FieldError>
          ) : null}
        </Field>
        <div className="flex items-end gap-2">
          <Button
            type="submit"
            variant="outline"
            disabled={templates.length === 0 || assignPending}
          >
            {assignPending ? (
              <>
                <Loader2
                  className="size-4 animate-spin"
                  data-icon="inline-start"
                  aria-hidden
                />
                {t("shiftAssigning")}
              </>
            ) : (
              t("shiftAssignSubmit")
            )}
          </Button>
        </div>
        {assignErrors?.form ? (
          <p className="text-xs text-destructive sm:col-span-2">
            {assignErrors.form}
          </p>
        ) : assignState?.ok ? (
          <p className="text-xs text-success sm:col-span-2" role="status">
            {assignState.regenerationResult === "updated"
              ? t("shiftAssigned")
              : t("shiftAssignedSkipped")}
          </p>
        ) : null}
      </form>

      <details className="group rounded border border-border bg-background/70 p-3">
        <summary className="cursor-pointer text-sm font-medium">
          {t("shiftCreateTitle")}
        </summary>
        <form action={createAction} className="mt-3 grid gap-3 lg:grid-cols-4">
          {createErrors?.form ? (
            <Alert variant="destructive" className="lg:col-span-4">
              <AlertTitle>{t("shiftErrorTitle")}</AlertTitle>
              <AlertDescription>{createErrors.form}</AlertDescription>
            </Alert>
          ) : null}
          <Field data-invalid={createErrors?.code ? true : undefined}>
            <FieldLabel htmlFor={codeFieldId}>{t("shiftCodeLabel")}</FieldLabel>
            <Input
              id={codeFieldId}
              name="code"
              required
              maxLength={24}
              aria-invalid={Boolean(createErrors?.code)}
            />
            {createErrors?.code ? (
              <FieldError>{createErrors.code}</FieldError>
            ) : null}
          </Field>
          <Field data-invalid={createErrors?.name ? true : undefined}>
            <FieldLabel htmlFor={nameFieldId}>{t("shiftNameLabel")}</FieldLabel>
            <Input
              id={nameFieldId}
              name="name"
              required
              maxLength={120}
              aria-invalid={Boolean(createErrors?.name)}
            />
            {createErrors?.name ? (
              <FieldError>{createErrors.name}</FieldError>
            ) : null}
          </Field>
          <Field
            data-invalid={createErrors?.defaultStartTime ? true : undefined}
          >
            <FieldLabel htmlFor={startFieldId}>
              {t("shiftDefaultStartLabel")}
            </FieldLabel>
            <Input
              id={startFieldId}
              name="defaultStartTime"
              type="time"
              required
              defaultValue="09:00"
              aria-invalid={Boolean(createErrors?.defaultStartTime)}
            />
            {createErrors?.defaultStartTime ? (
              <FieldError>{createErrors.defaultStartTime}</FieldError>
            ) : null}
          </Field>
          <Field data-invalid={createErrors?.defaultEndTime ? true : undefined}>
            <FieldLabel htmlFor={endFieldId}>
              {t("shiftDefaultEndLabel")}
            </FieldLabel>
            <Input
              id={endFieldId}
              name="defaultEndTime"
              type="time"
              required
              defaultValue="18:00"
              aria-invalid={Boolean(createErrors?.defaultEndTime)}
            />
            {createErrors?.defaultEndTime ? (
              <FieldError>{createErrors.defaultEndTime}</FieldError>
            ) : null}
          </Field>
          <MinuteField
            id={unpaidBreakFieldId}
            name="unpaidBreakMinutes"
            label={t("shiftUnpaidBreakLabel")}
            error={createErrors?.unpaidBreakMinutes}
            defaultValue={60}
          />
          <MinuteField
            id={paidBreakFieldId}
            name="paidBreakMinutes"
            label={t("shiftPaidBreakLabel")}
            error={createErrors?.paidBreakMinutes}
            defaultValue={0}
          />
          <MinuteField
            id={lateGraceFieldId}
            name="lateGraceMinutes"
            label={t("shiftLateGraceLabel")}
            error={createErrors?.lateGraceMinutes}
            defaultValue={5}
          />
          <MinuteField
            id={earlyOutGraceFieldId}
            name="earlyOutGraceMinutes"
            label={t("shiftEarlyOutGraceLabel")}
            error={createErrors?.earlyOutGraceMinutes}
            defaultValue={5}
          />
          <MinuteField
            id={overtimeGraceFieldId}
            name="overtimeGraceMinutes"
            label={t("shiftOvertimeGraceLabel")}
            error={createErrors?.overtimeGraceMinutes}
            defaultValue={0}
          />
          <MinuteField
            id={maxDurationFieldId}
            name="maxContinuousClockMinutes"
            label={t("shiftMaxDurationLabel")}
            error={createErrors?.maxContinuousClockMinutes}
            defaultValue={960}
            min={1}
          />
          <Field
            data-invalid={createErrors?.holidayBehavior ? true : undefined}
          >
            <FieldLabel htmlFor={holidayBehaviorFieldId}>
              {t("shiftHolidayBehaviorLabel")}
            </FieldLabel>
            <select
              id={holidayBehaviorFieldId}
              name="holidayBehavior"
              defaultValue="scheduled"
              className={SELECT_CLASS}
              aria-invalid={Boolean(createErrors?.holidayBehavior)}
            >
              <option value="scheduled">
                {t("holidayBehavior.scheduled")}
              </option>
              <option value="skip">{t("holidayBehavior.skip")}</option>
              <option value="paid_holiday">
                {t("holidayBehavior.paid_holiday")}
              </option>
            </select>
            {createErrors?.holidayBehavior ? (
              <FieldError>{createErrors.holidayBehavior}</FieldError>
            ) : null}
          </Field>
          <div className="flex items-end">
            <Button type="submit" disabled={createPending}>
              {createPending ? (
                <>
                  <Loader2
                    className="size-4 animate-spin"
                    data-icon="inline-start"
                    aria-hidden
                  />
                  {t("shiftCreating")}
                </>
              ) : (
                <>
                  <PlusIcon
                    className="size-4"
                    data-icon="inline-start"
                    aria-hidden
                  />
                  {t("shiftCreateSubmit")}
                </>
              )}
            </Button>
          </div>
          {createState?.ok ? (
            <p className="text-xs text-success lg:col-span-4" role="status">
              {t("shiftCreated")}
            </p>
          ) : null}
        </form>
      </details>
    </>
  )
}

function MinuteField({
  id,
  name,
  label,
  error,
  defaultValue,
  min = 0,
}: {
  id: string
  name: string
  label: string
  error?: string
  defaultValue: number
  min?: number
}) {
  return (
    <Field data-invalid={error ? true : undefined}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        id={id}
        name={name}
        type="number"
        inputMode="numeric"
        min={min}
        step={1}
        required
        defaultValue={defaultValue}
        aria-invalid={Boolean(error)}
      />
      {error ? <FieldError>{error}</FieldError> : null}
    </Field>
  )
}
