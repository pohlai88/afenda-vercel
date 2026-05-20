"use client"

import { useActionState, useId } from "react"
import { useTranslations } from "next-intl"
import { Loader2 } from "lucide-react"

import { Alert, AlertDescription } from "#components2/ui/alert"
import { Button } from "#components2/ui/button"
import { Field, FieldError, FieldLabel } from "#components2/ui/field"
import { Input } from "#components2/ui/input"
import { Textarea } from "#components2/ui/textarea"

import type {
  BulkAssignEmployeeShiftsFormState,
  SftAvailabilityFormState,
  SftScheduleChangeFormState,
} from "../../../types"
import {
  applyHolidayPlanAction,
  applyRestOffPlanAction,
  approveScheduleChangeRequestAction,
  createShiftAvailabilityAction,
  rejectScheduleChangeRequestAction,
  returnScheduleChangeRequestAction,
} from "#features/hrm/client"

const SELECT_CLASS =
  "h-9 w-full rounded border border-border bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"

type TemplateChoice = {
  readonly id: string
  readonly code: string
  readonly name: string
}

export function SftAvailabilityCreateForm({
  defaultDate,
}: {
  defaultDate: string
}) {
  const t = useTranslations("Dashboard.Hrm.shiftScheduling")
  const [state, formAction, pending] = useActionState<
    SftAvailabilityFormState | undefined,
    FormData
  >(createShiftAvailabilityAction, undefined)

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <Field>
        <FieldLabel htmlFor="sft-avail-emp">{t("fieldEmployeeId")}</FieldLabel>
        <Input id="sft-avail-emp" name="employeeId" required />
      </Field>
      <Field>
        <FieldLabel htmlFor="sft-avail-date">
          {t("fieldAttendanceDate")}
        </FieldLabel>
        <Input
          id="sft-avail-date"
          name="attendanceDate"
          type="date"
          required
          defaultValue={defaultDate}
        />
      </Field>
      <Field>
        <FieldLabel htmlFor="sft-avail-kind">
          {t("fieldAvailabilityKind")}
        </FieldLabel>
        <select
          id="sft-avail-kind"
          name="kind"
          className={SELECT_CLASS}
          defaultValue="unavailable"
        >
          <option value="unavailable">
            {t("availabilityKindUnavailable")}
          </option>
          <option value="preferred">{t("availabilityKindPreferred")}</option>
        </select>
      </Field>
      <Field>
        <FieldLabel htmlFor="sft-avail-reason">{t("fieldReason")}</FieldLabel>
        <Textarea id="sft-avail-reason" name="reason" rows={2} />
      </Field>
      {state && !state.ok && state.errors?.form ? (
        <Alert variant="destructive">
          <AlertDescription>{state.errors.form}</AlertDescription>
        </Alert>
      ) : null}
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          t("availabilityCreateSubmit")
        )}
      </Button>
    </form>
  )
}

function PlannerForm({
  templates,
  rangeStart,
  rangeEnd,
  action,
  submitLabel,
}: {
  templates: readonly TemplateChoice[]
  rangeStart: string
  rangeEnd: string
  action: typeof applyRestOffPlanAction
  submitLabel: string
}) {
  const t = useTranslations("Dashboard.Hrm.shiftScheduling")
  const [state, formAction, pending] = useActionState<
    BulkAssignEmployeeShiftsFormState | undefined,
    FormData
  >(action, undefined)

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <Field>
        <FieldLabel htmlFor="sft-plan-emp">
          {t("fieldEmployeeIdsCsv")}
        </FieldLabel>
        <Input
          id="sft-plan-emp"
          name="employeeIds"
          required
          placeholder="uuid1,uuid2"
        />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="sft-plan-start">
            {t("fieldRangeStart")}
          </FieldLabel>
          <Input
            id="sft-plan-start"
            name="rangeStart"
            type="date"
            required
            defaultValue={rangeStart}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="sft-plan-end">{t("fieldRangeEnd")}</FieldLabel>
          <Input
            id="sft-plan-end"
            name="rangeEnd"
            type="date"
            required
            defaultValue={rangeEnd}
          />
        </Field>
      </div>
      <Field>
        <FieldLabel htmlFor="sft-plan-tpl">
          {t("fieldShiftTemplate")}
        </FieldLabel>
        <select
          id="sft-plan-tpl"
          name="shiftTemplateId"
          className={SELECT_CLASS}
          required
        >
          <option value="" disabled>
            {t("selectShiftTemplate")}
          </option>
          {templates.map((row) => (
            <option key={row.id} value={row.id}>
              {row.code} · {row.name}
            </option>
          ))}
        </select>
      </Field>
      {state && !state.ok && state.errors?.form ? (
        <Alert variant="destructive">
          <AlertDescription>{state.errors.form}</AlertDescription>
        </Alert>
      ) : null}
      {state?.ok && "applied" in state ? (
        <p className="text-xs text-muted-foreground">
          {t("plannerApplied", {
            applied: state.applied,
            skipped: state.skipped,
          })}
        </p>
      ) : null}
      <Button
        type="submit"
        size="sm"
        disabled={pending || templates.length === 0}
      >
        {pending ? <Loader2 className="size-4 animate-spin" /> : submitLabel}
      </Button>
    </form>
  )
}

export function SftRestOffPlannerForm(props: {
  templates: readonly TemplateChoice[]
  rangeStart: string
  rangeEnd: string
}) {
  const t = useTranslations("Dashboard.Hrm.shiftScheduling")
  return (
    <PlannerForm
      {...props}
      action={applyRestOffPlanAction}
      submitLabel={t("restOffPlannerSubmit")}
    />
  )
}

export function SftHolidayPlannerForm(props: {
  templates: readonly TemplateChoice[]
  rangeStart: string
  rangeEnd: string
}) {
  const t = useTranslations("Dashboard.Hrm.shiftScheduling")
  return (
    <PlannerForm
      {...props}
      action={applyHolidayPlanAction}
      submitLabel={t("holidayPlannerSubmit")}
    />
  )
}

export function SftScheduleChangeDecisionForms({
  requests,
}: {
  requests: readonly { id: string; label: string }[]
}) {
  const t = useTranslations("Dashboard.Hrm.shiftScheduling")
  const approveId = useId()
  const rejectId = useId()
  const returnId = useId()

  const [approveState, approveAction, approvePending] = useActionState<
    SftScheduleChangeFormState | undefined,
    FormData
  >(approveScheduleChangeRequestAction, undefined)

  const [rejectState, rejectAction, rejectPending] = useActionState<
    SftScheduleChangeFormState | undefined,
    FormData
  >(rejectScheduleChangeRequestAction, undefined)

  const [returnState, returnAction, returnPending] = useActionState<
    SftScheduleChangeFormState | undefined,
    FormData
  >(returnScheduleChangeRequestAction, undefined)

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <form
        action={approveAction}
        className="flex flex-col gap-2 rounded-md border p-3"
      >
        <Field>
          <FieldLabel htmlFor={`${approveId}-req`}>
            {t("fieldRequest")}
          </FieldLabel>
          <select
            id={`${approveId}-req`}
            name="requestId"
            className={SELECT_CLASS}
            required
          >
            <option value="" disabled>
              {t("selectRequest")}
            </option>
            {requests.map((row) => (
              <option key={row.id} value={row.id}>
                {row.label}
              </option>
            ))}
          </select>
        </Field>
        <Field>
          <FieldLabel htmlFor={`${approveId}-note`}>
            {t("fieldManagerNote")}
          </FieldLabel>
          <Input id={`${approveId}-note`} name="managerNote" />
        </Field>
        {approveState && !approveState.ok ? (
          <FieldError>{approveState.errors?.form}</FieldError>
        ) : null}
        <Button type="submit" size="sm" disabled={approvePending}>
          {t("scheduleChangeApprove")}
        </Button>
      </form>
      <form
        action={rejectAction}
        className="flex flex-col gap-2 rounded-md border p-3"
      >
        <Field>
          <FieldLabel htmlFor={`${rejectId}-req`}>
            {t("fieldRequest")}
          </FieldLabel>
          <select
            id={`${rejectId}-req`}
            name="requestId"
            className={SELECT_CLASS}
            required
          >
            <option value="" disabled>
              {t("selectRequest")}
            </option>
            {requests.map((row) => (
              <option key={row.id} value={row.id}>
                {row.label}
              </option>
            ))}
          </select>
        </Field>
        <Field>
          <FieldLabel htmlFor={`${rejectId}-reason`}>
            {t("fieldRejectReason")}
          </FieldLabel>
          <Textarea
            id={`${rejectId}-reason`}
            name="rejectedReason"
            required
            rows={2}
          />
        </Field>
        {rejectState && !rejectState.ok ? (
          <FieldError>{rejectState.errors?.form}</FieldError>
        ) : null}
        <Button
          type="submit"
          size="sm"
          variant="destructive"
          disabled={rejectPending}
        >
          {t("scheduleChangeReject")}
        </Button>
      </form>
      <form
        action={returnAction}
        className="flex flex-col gap-2 rounded-md border p-3"
      >
        <Field>
          <FieldLabel htmlFor={`${returnId}-req`}>
            {t("fieldRequest")}
          </FieldLabel>
          <select
            id={`${returnId}-req`}
            name="requestId"
            className={SELECT_CLASS}
            required
          >
            <option value="" disabled>
              {t("selectRequest")}
            </option>
            {requests.map((row) => (
              <option key={row.id} value={row.id}>
                {row.label}
              </option>
            ))}
          </select>
        </Field>
        <Field>
          <FieldLabel htmlFor={`${returnId}-reason`}>
            {t("scheduleChangeReturnReason")}
          </FieldLabel>
          <Textarea
            id={`${returnId}-reason`}
            name="returnedReason"
            required
            rows={2}
          />
        </Field>
        {returnState && !returnState.ok ? (
          <FieldError>{returnState.errors?.form}</FieldError>
        ) : null}
        <Button
          type="submit"
          size="sm"
          variant="outline"
          disabled={returnPending}
        >
          {t("scheduleChangeReturn")}
        </Button>
      </form>
    </div>
  )
}
