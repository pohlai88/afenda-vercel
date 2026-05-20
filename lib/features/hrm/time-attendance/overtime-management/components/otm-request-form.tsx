"use client"

import { useActionState, useId, useState } from "react"
import { useTranslations } from "next-intl"
import { Loader2 } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "#components2/ui/alert"
import { Button } from "#components2/ui/button"
import { Field, FieldError, FieldLabel } from "#components2/ui/field"
import { Input } from "#components2/ui/input"

import {
  applyOtmOnBehalfAction,
  requestOwnOtmAction,
  type OtmRequestMutationFormState,
} from "#features/hrm/client"

import { HRM_OTM_DAY_CATEGORIES, HRM_OTM_TIMING_KINDS } from "../schemas/otm.schema"
import type {
  OtmEmployeeChoiceRow,
  OtmTypeChoiceRow,
} from "../data/otm.types.shared"
import { useFormSuccess } from "../../../_internal-cross-cutting/use-form-success.client"

type OtmRequestFormProps = {
  employees: OtmEmployeeChoiceRow[]
  overtimeTypes: OtmTypeChoiceRow[]
  mode: "self" | "on_behalf"
  defaultEmployeeId?: string
  onSuccess?: () => void
}

const SELECT_CLASS =
  "h-9 w-full rounded border border-border bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-50"

export function OtmRequestForm({
  employees,
  overtimeTypes,
  mode,
  defaultEmployeeId,
  onSuccess,
}: OtmRequestFormProps) {
  const t = useTranslations("Dashboard.Hrm.overtime")
  const action = mode === "self" ? requestOwnOtmAction : applyOtmOnBehalfAction
  const [state, formAction, pending] = useActionState<
    OtmRequestMutationFormState | undefined,
    FormData
  >(action, undefined)

  const [selectedEmployeeId, setSelectedEmployeeId] = useState(
    defaultEmployeeId ?? ""
  )

  const workDateId = useId()
  const startTimeId = useId()
  const endTimeId = useId()
  const timingKindId = useId()
  const overtimeTypeId = useId()
  const dayCategoryId = useId()
  const eligibilityExceptionId = useId()
  const reasonId = useId()
  const usesTypeCatalog = overtimeTypes.length > 0
  const employeeId = useId()

  useFormSuccess(state, onSuccess)

  const errors = state && !state.ok ? state.errors : null

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {mode === "on_behalf" ? (
        <Field>
          <FieldLabel htmlFor={employeeId}>{t("fieldEmployee")}</FieldLabel>
          <select
            id={employeeId}
            name="employeeId"
            className={SELECT_CLASS}
            required
            value={selectedEmployeeId}
            onChange={(event) => setSelectedEmployeeId(event.target.value)}
          >
            <option value="">{t("fieldEmployeePlaceholder")}</option>
            {employees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.employeeNumber
                  ? `${employee.legalName} · ${employee.employeeNumber}`
                  : employee.legalName}
              </option>
            ))}
          </select>
          {errors?.employeeId ? (
            <FieldError>{errors.employeeId}</FieldError>
          ) : null}
        </Field>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor={workDateId}>{t("fieldWorkDate")}</FieldLabel>
          <Input id={workDateId} name="workDate" type="date" required />
          {errors?.workDate ? <FieldError>{errors.workDate}</FieldError> : null}
        </Field>
        <Field>
          <FieldLabel htmlFor={timingKindId}>{t("fieldTimingKind")}</FieldLabel>
          <select
            id={timingKindId}
            name="timingKind"
            className={SELECT_CLASS}
            defaultValue="actual"
          >
            {HRM_OTM_TIMING_KINDS.map((kind) => (
              <option key={kind} value={kind}>
                {t(`timingKindLabels.${kind}`)}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor={startTimeId}>{t("fieldStartTime")}</FieldLabel>
          <Input
            id={startTimeId}
            name="startTime"
            type="time"
            required
            step={60}
          />
          {errors?.startTime ? (
            <FieldError>{errors.startTime}</FieldError>
          ) : null}
        </Field>
        <Field>
          <FieldLabel htmlFor={endTimeId}>{t("fieldEndTime")}</FieldLabel>
          <Input
            id={endTimeId}
            name="endTime"
            type="time"
            required
            step={60}
          />
          {errors?.endTime ? <FieldError>{errors.endTime}</FieldError> : null}
        </Field>
      </div>

      {usesTypeCatalog ? (
        <Field>
          <FieldLabel htmlFor={overtimeTypeId}>
            {t("fieldOvertimeType")}
          </FieldLabel>
          <select
            id={overtimeTypeId}
            name="overtimeTypeId"
            className={SELECT_CLASS}
            required
          >
            <option value="">{t("fieldOvertimeTypePlaceholder")}</option>
            {overtimeTypes.map((type) => (
              <option key={type.id} value={type.id}>
                {type.label}
              </option>
            ))}
          </select>
        </Field>
      ) : (
        <Field>
          <FieldLabel htmlFor={dayCategoryId}>
            {t("fieldDayCategory")}
          </FieldLabel>
          <select
            id={dayCategoryId}
            name="dayCategory"
            className={SELECT_CLASS}
            defaultValue="normal_day"
          >
            {HRM_OTM_DAY_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {t(`dayCategoryLabels.${category}`)}
              </option>
            ))}
          </select>
        </Field>
      )}

      {usesTypeCatalog && mode === "on_behalf" ? (
        <Field>
          <FieldLabel htmlFor={eligibilityExceptionId}>
            {t("fieldEligibilityException")}
          </FieldLabel>
          <Input
            id={eligibilityExceptionId}
            name="eligibilityExceptionReason"
          />
          <p className="text-xs text-muted-foreground">
            {t("fieldEligibilityExceptionHint")}
          </p>
        </Field>
      ) : null}

      <Field>
        <FieldLabel htmlFor={reasonId}>{t("fieldReason")}</FieldLabel>
        <Input id={reasonId} name="reason" required />
        {errors?.reason ? <FieldError>{errors.reason}</FieldError> : null}
      </Field>

      {errors?.form ? (
        <Alert variant="destructive">
          <AlertTitle>{t("submitFailedTitle")}</AlertTitle>
          <AlertDescription>{errors.form}</AlertDescription>
        </Alert>
      ) : null}

      {state?.ok ? (
        <Alert>
          <AlertTitle>{t("submitSuccessTitle")}</AlertTitle>
          <AlertDescription>{t("submitSuccessBody")}</AlertDescription>
        </Alert>
      ) : null}

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
