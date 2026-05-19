"use client"

import {
  useActionState, useId, useMemo, useState
} from "react"
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

import { useFormSuccess } from "../../../_internal-cross-cutting/use-form-success.client"
import { enrollBenefitAction } from "../actions/benefit-enrollment.actions"
import type { BenefitEnrollFormState } from "../../../types"

import { BENEFIT_COVERAGE_LEVELS } from "../data/benefit-helpers.shared"
import type { LeaveEmployeeChoiceRow } from "../../../time-attendance/leave-attendance-management/data/leave-request.queries.server"
import type { DependentRow } from "../../../employee-management/employee-records-management/data/dependent.queries.server"

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
  dependents: ReadonlyArray<DependentRow>
  onSuccess?: () => void
}

export function BenefitEnrollmentForm({
  employees,
  plans,
  dependents,
  onSuccess,
}: BenefitEnrollmentFormProps) {
  const t = useTranslations("Dashboard.Hrm.benefits")
  const [state, formAction, pending] = useActionState<
    BenefitEnrollFormState | undefined,
    FormData
  >(enrollBenefitAction, undefined)

  const empId = useId()
  const planId = useId()
  const covId = useId()
  const effId = useId()
  const effToId = useId()
  const overrideId = useId()
  const erAmt = useId()
  const eeAmt = useId()
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("")
  const [coverageLevel, setCoverageLevel] = useState<string>(
    BENEFIT_COVERAGE_LEVELS[0]
  )

  const employeeDependents = useMemo(
    () =>
      dependents.filter(
        (dependent) => dependent.employeeId === selectedEmployeeId
      ),
    [dependents, selectedEmployeeId]
  )
  const showDependents = coverageLevel !== "employee_only"
  useFormSuccess(state, onSuccess)

  const fieldErrors = useMemo(() => {
    if (!state || state.ok) return null
    return state.errors
  }, [state])

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {fieldErrors?.form ? (
        <Alert variant="destructive">
          <AlertTitle>{t("enrollForm.errorTitle")}</AlertTitle>
          <AlertDescription>{fieldErrors.form}</AlertDescription>
        </Alert>
      ) : null}

      <Field>
        <FieldLabel htmlFor={empId}>{t("enrollForm.fieldEmployee")}</FieldLabel>
        <select
          id={empId}
          name="employeeId"
          className={SELECT_CLASS}
          required
          value={selectedEmployeeId}
          onChange={(event) => setSelectedEmployeeId(event.target.value)}
        >
          <option value="">{t("enrollForm.selectEmployee")}</option>
          {employees.map((e) => (
            <option key={e.id} value={e.id}>
              {e.employeeNumber} — {e.legalName}
            </option>
          ))}
        </select>
        {fieldErrors?.employeeId ? (
          <FieldError>{fieldErrors.employeeId}</FieldError>
        ) : null}
      </Field>

      <Field>
        <FieldLabel htmlFor={planId}>{t("enrollForm.fieldPlan")}</FieldLabel>
        <select id={planId} name="planId" className={SELECT_CLASS} required>
          <option value="">{t("enrollForm.selectPlan")}</option>
          {plans.map((p) => (
            <option key={p.id} value={p.id}>
              {p.code} — {p.name}
            </option>
          ))}
        </select>
        {fieldErrors?.planId ? (
          <FieldError>{fieldErrors.planId}</FieldError>
        ) : null}
      </Field>

      <Field>
        <FieldLabel htmlFor={covId}>{t("enrollForm.fieldCoverage")}</FieldLabel>
        <select
          id={covId}
          name="coverageLevel"
          className={SELECT_CLASS}
          required
          value={coverageLevel}
          onChange={(event) => setCoverageLevel(event.target.value)}
        >
          {BENEFIT_COVERAGE_LEVELS.map((level) => (
            <option key={level} value={level}>
              {t(`enrollForm.coverageLevels.${level}`)}
            </option>
          ))}
        </select>
        {fieldErrors?.coverageLevel ? (
          <FieldError>{fieldErrors.coverageLevel}</FieldError>
        ) : null}
      </Field>

      <Field>
        <FieldLabel htmlFor={effId}>
          {t("enrollForm.fieldEffectiveFrom")}
        </FieldLabel>
        <Input id={effId} name="effectiveFrom" type="date" />
        <FieldDescription>
          {t("enrollForm.fieldEffectiveFromHint")}
        </FieldDescription>
        {fieldErrors?.effectiveFrom ? (
          <FieldError>{fieldErrors.effectiveFrom}</FieldError>
        ) : null}
      </Field>

      <Field>
        <FieldLabel htmlFor={effToId}>
          {t("enrollForm.fieldEffectiveTo")}
        </FieldLabel>
        <Input id={effToId} name="effectiveTo" type="date" />
        <FieldDescription>
          {t("enrollForm.fieldEffectiveToHint")}
        </FieldDescription>
        {fieldErrors?.effectiveTo ? (
          <FieldError>{fieldErrors.effectiveTo}</FieldError>
        ) : null}
      </Field>

      {showDependents ? (
        <Field>
          <FieldLabel>{t("enrollForm.fieldDependents")}</FieldLabel>
          <FieldDescription>
            {t("enrollForm.fieldDependentsHint")}
          </FieldDescription>
          {employeeDependents.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("enrollForm.noDependentsForEmployee")}
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {employeeDependents.map((dependent) => (
                <label
                  key={dependent.id}
                  className="flex items-center gap-2 text-sm"
                >
                  <input
                    type="checkbox"
                    name="dependentIds"
                    value={dependent.id}
                  />
                  <span>
                    {dependent.legalName} ({dependent.relationship})
                  </span>
                </label>
              ))}
            </div>
          )}
        </Field>
      ) : null}

      <Field>
        <FieldLabel htmlFor={overrideId}>
          {t("enrollForm.fieldEligibilityOverride")}
        </FieldLabel>
        <Input
          id={overrideId}
          name="eligibilityOverrideReason"
          maxLength={2000}
        />
        <FieldDescription>
          {t("enrollForm.fieldEligibilityOverrideHint")}
        </FieldDescription>
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor={erAmt}>
            {t("enrollForm.fieldEmployerAmount")}
          </FieldLabel>
          <Input
            id={erAmt}
            name="employerContributionAmount"
            type="number"
            min={0}
            step="0.01"
          />
        </Field>
        <Field>
          <FieldLabel htmlFor={eeAmt}>
            {t("enrollForm.fieldEmployeeAmount")}
          </FieldLabel>
          <Input
            id={eeAmt}
            name="employeeContributionAmount"
            type="number"
            min={0}
            step="0.01"
          />
        </Field>
      </div>

      <Button type="submit" disabled={pending} className="self-start">
        {pending ? (
          <>
            <Loader2
              className="size-4 animate-spin"
              data-icon="inline-start"
              aria-hidden
            />
            {t("enrollForm.submitting")}
          </>
        ) : (
          t("enrollForm.submit")
        )}
      </Button>
    </form>
  )
}
