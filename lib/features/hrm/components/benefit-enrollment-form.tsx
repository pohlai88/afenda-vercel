"use client"

import { useActionState, useEffect, useId, useMemo, useRef } from "react"
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

import { enrollBenefitAction, type BenefitEnrollFormState } from "#features/hrm/client"

import { BENEFIT_COVERAGE_LEVELS } from "../data/benefit-helpers.shared"
import type { LeaveEmployeeChoiceRow } from "../data/leave-request.queries.server"

const SELECT_CLASS =
  "h-9 w-full rounded border border-border bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-50"

export type BenefitPlanChoiceRow = {
  id: string
  code: string
  name: string
}

type BenefitEnrollmentFormProps = {
  employees: ReadonlyArray<LeaveEmployeeChoiceRow>
  plans: ReadonlyArray<BenefitPlanChoiceRow>
  onSuccess?: () => void
}

export function BenefitEnrollmentForm({
  employees,
  plans,
  onSuccess,
}: BenefitEnrollmentFormProps) {
  const t = useTranslations("Dashboard.Hrm.benefits.enrollForm")
  const [state, formAction, pending] = useActionState<
    BenefitEnrollFormState | undefined,
    FormData
  >(enrollBenefitAction, undefined)

  const empId = useId()
  const planId = useId()
  const covId = useId()
  const effId = useId()
  const erAmt = useId()
  const eeAmt = useId()

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
      {fieldErrors?.form ? (
        <Alert variant="destructive">
          <AlertTitle>{t("errorTitle")}</AlertTitle>
          <AlertDescription>{fieldErrors.form}</AlertDescription>
        </Alert>
      ) : null}

      <Field>
        <FieldLabel htmlFor={empId}>{t("fieldEmployee")}</FieldLabel>
        <select id={empId} name="employeeId" className={SELECT_CLASS} required>
          <option value="">{t("selectEmployee")}</option>
          {employees.map((e) => (
            <option key={e.id} value={e.id}>
              {e.employeeNumber} — {e.legalName}
            </option>
          ))}
        </select>
        {fieldErrors?.employeeId ? <FieldError>{fieldErrors.employeeId}</FieldError> : null}
      </Field>

      <Field>
        <FieldLabel htmlFor={planId}>{t("fieldPlan")}</FieldLabel>
        <select id={planId} name="planId" className={SELECT_CLASS} required>
          <option value="">{t("selectPlan")}</option>
          {plans.map((p) => (
            <option key={p.id} value={p.id}>
              {p.code} — {p.name}
            </option>
          ))}
        </select>
        {fieldErrors?.planId ? <FieldError>{fieldErrors.planId}</FieldError> : null}
      </Field>

      <Field>
        <FieldLabel htmlFor={covId}>{t("fieldCoverage")}</FieldLabel>
        <select id={covId} name="coverageLevel" className={SELECT_CLASS} required defaultValue="employee_only">
          {BENEFIT_COVERAGE_LEVELS.map((level) => (
            <option key={level} value={level}>
              {t(`coverageLevels.${level}`)}
            </option>
          ))}
        </select>
        {fieldErrors?.coverageLevel ? (
          <FieldError>{fieldErrors.coverageLevel}</FieldError>
        ) : null}
      </Field>

      <Field>
        <FieldLabel htmlFor={effId}>{t("fieldEffectiveFrom")}</FieldLabel>
        <Input id={effId} name="effectiveFrom" type="date" />
        <FieldDescription>{t("fieldEffectiveFromHint")}</FieldDescription>
        {fieldErrors?.effectiveFrom ? (
          <FieldError>{fieldErrors.effectiveFrom}</FieldError>
        ) : null}
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor={erAmt}>{t("fieldEmployerAmount")}</FieldLabel>
          <Input id={erAmt} name="employerContributionAmount" type="number" min={0} step="0.01" />
        </Field>
        <Field>
          <FieldLabel htmlFor={eeAmt}>{t("fieldEmployeeAmount")}</FieldLabel>
          <Input id={eeAmt} name="employeeContributionAmount" type="number" min={0} step="0.01" />
        </Field>
      </div>

      <Button type="submit" disabled={pending} className="self-start">
        {pending ? (
          <>
            <Loader2 className="size-4 animate-spin" data-icon="inline-start" aria-hidden />
            {t("submitting")}
          </>
        ) : (
          t("submit")
        )}
      </Button>
    </form>
  )
}
