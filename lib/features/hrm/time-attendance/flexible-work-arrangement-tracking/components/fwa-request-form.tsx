"use client"

import { useActionState, useEffect, useId, useRef } from "react"
import { useTranslations } from "next-intl"
import { Loader2 } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "#components2/ui/alert"
import { Button } from "#components2/ui/button"
import {
  Field,
  FieldError,
  FieldLabel,
} from "#components2/ui/field"
import { Input } from "#components2/ui/input"

import {
  applyFwaOnBehalfAction,
  requestOwnFwaAction,
  type FwaRequestMutationFormState,
} from "#features/hrm/client"

import type {
  FwaArrangementTypeChoiceRow,
  FwaEmployeeChoiceRow,
} from "../data/fwa.queries.server"

type FwaRequestFormProps = {
  employees: FwaEmployeeChoiceRow[]
  arrangementTypes: FwaArrangementTypeChoiceRow[]
  mode: "self" | "on_behalf"
  defaultEmployeeId?: string
  onSuccess?: () => void
}

const SELECT_CLASS =
  "h-9 w-full rounded border border-border bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-50"

export function FwaRequestForm({
  employees,
  arrangementTypes,
  mode,
  defaultEmployeeId,
  onSuccess,
}: FwaRequestFormProps) {
  const t = useTranslations("Dashboard.Hrm.flexibleWork")
  const action = mode === "self" ? requestOwnFwaAction : applyFwaOnBehalfAction
  const [state, formAction, pending] = useActionState<
    FwaRequestMutationFormState | undefined,
    FormData
  >(action, undefined)

  const employeeId = useId()
  const arrangementTypeId = useId()
  const startDateId = useId()
  const endDateId = useId()
  const reasonId = useId()
  const remoteLocationId = useId()
  const weeklyHoursId = useId()
  const reviewDateId = useId()

  const onSuccessRef = useRef(onSuccess)
  useEffect(() => {
    onSuccessRef.current = onSuccess
  }, [onSuccess])

  useEffect(() => {
    if (state?.ok) {
      onSuccessRef.current?.()
    }
  }, [state])

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
            defaultValue={defaultEmployeeId ?? ""}
            required
            disabled={pending}
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

      <Field>
        <FieldLabel htmlFor={arrangementTypeId}>
          {t("fieldArrangementType")}
        </FieldLabel>
        <select
          id={arrangementTypeId}
          name="arrangementTypeId"
          className={SELECT_CLASS}
          required
          disabled={pending}
        >
          <option value="">{t("fieldArrangementTypePlaceholder")}</option>
          {arrangementTypes.map((type) => (
            <option key={type.id} value={type.id}>
              {type.label} ({type.code})
            </option>
          ))}
        </select>
        {errors?.arrangementTypeId ? (
          <FieldError>{errors.arrangementTypeId}</FieldError>
        ) : null}
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor={reviewDateId}>{t("fieldReviewDate")}</FieldLabel>
          <Input id={reviewDateId} name="reviewDate" type="date" disabled={pending} />
        </Field>
        <Field>
          <FieldLabel htmlFor={startDateId}>{t("fieldStartDate")}</FieldLabel>
          <Input
            id={startDateId}
            name="startDate"
            type="date"
            required
            disabled={pending}
          />
          {errors?.startDate ? (
            <FieldError>{errors.startDate}</FieldError>
          ) : null}
        </Field>
        <Field>
          <FieldLabel htmlFor={endDateId}>{t("fieldEndDate")}</FieldLabel>
          <Input id={endDateId} name="endDate" type="date" disabled={pending} />
          {errors?.endDate ? <FieldError>{errors.endDate}</FieldError> : null}
        </Field>
      </div>

      <Field>
        <FieldLabel htmlFor={weeklyHoursId}>
          {t("fieldExpectedWeeklyHours")}
        </FieldLabel>
        <Input
          id={weeklyHoursId}
          name="expectedWeeklyHours"
          type="number"
          min={1}
          step={0.5}
          disabled={pending}
        />
      </Field>

      <Field>
        <FieldLabel htmlFor={remoteLocationId}>
          {t("fieldRemoteLocation")}
        </FieldLabel>
        <Input
          id={remoteLocationId}
          name="remoteLocation"
          disabled={pending}
        />
        {errors?.remoteLocation ? (
          <FieldError>{errors.remoteLocation}</FieldError>
        ) : null}
      </Field>

      <Field>
        <FieldLabel htmlFor={reasonId}>{t("fieldReason")}</FieldLabel>
        <Input id={reasonId} name="reason" required disabled={pending} />
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

      <Button type="submit" disabled={pending || arrangementTypes.length === 0}>
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
          t("submitRequest")
        )}
      </Button>
    </form>
  )
}
