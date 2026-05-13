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
import { Textarea } from "#components/ui/textarea"

import {
  createBenefitPlanAction,
  updateBenefitPlanAction,
  type BenefitPlanMutationFormState,
} from "#features/hrm/client"

import {
  BENEFIT_CONTRIBUTION_TYPES,
  BENEFIT_COVERAGE_LEVELS,
  BENEFIT_KINDS,
} from "../data/benefit-helpers.shared"
import type { BenefitPlanRow } from "../data/benefit-model.shared"

const SELECT_CLASS =
  "h-9 w-full rounded border border-border bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-50"

function isoDateOnly(value: Date | null | undefined): string {
  if (!value) return ""
  return value.toISOString().slice(0, 10)
}

function parseOptionalNumber(value: string | null | undefined): string {
  if (value === null || value === undefined) return ""
  return value
}

type BenefitPlanFormProps = {
  mode: "create" | "edit"
  plan?: BenefitPlanRow
  onSuccess?: () => void
}

export function BenefitPlanForm({
  mode,
  plan,
  onSuccess,
}: BenefitPlanFormProps) {
  const t = useTranslations("Dashboard.Hrm.benefits.planForm")
  const action =
    mode === "create" ? createBenefitPlanAction : updateBenefitPlanAction
  const [state, formAction, pending] = useActionState<
    BenefitPlanMutationFormState | undefined,
    FormData
  >(action, undefined)

  const codeId = useId()
  const nameId = useId()
  const descId = useId()
  const kindId = useId()
  const typeId = useId()
  const empTypeId = useId()
  const empValId = useId()
  const erTypeId = useId()
  const erValId = useId()
  const waitId = useId()
  const maxId = useId()
  const effId = useId()

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

  const selectedLevels = new Set(
    plan?.coverageLevels?.filter(
      (x): x is (typeof BENEFIT_COVERAGE_LEVELS)[number] =>
        (BENEFIT_COVERAGE_LEVELS as readonly string[]).includes(x)
    ) ?? []
  )

  return (
    <form
      action={formAction}
      className="flex max-h-[min(70vh,640px)] flex-col gap-4 overflow-y-auto pr-1"
    >
      {mode === "edit" && plan ? (
        <input type="hidden" name="planId" value={plan.id} />
      ) : null}

      {fieldErrors?.form ? (
        <Alert variant="destructive">
          <AlertTitle>{t("errorTitle")}</AlertTitle>
          <AlertDescription>{fieldErrors.form}</AlertDescription>
        </Alert>
      ) : null}

      <Field>
        <FieldLabel htmlFor={codeId}>{t("fieldCode")}</FieldLabel>
        <Input
          id={codeId}
          name="code"
          required
          minLength={1}
          maxLength={64}
          autoComplete="off"
          defaultValue={plan?.code}
          readOnly={mode === "edit"}
          aria-readonly={mode === "edit" ? true : undefined}
        />
        <FieldDescription>{t("fieldCodeHint")}</FieldDescription>
        {fieldErrors?.code ? <FieldError>{fieldErrors.code}</FieldError> : null}
      </Field>

      <Field>
        <FieldLabel htmlFor={nameId}>{t("fieldName")}</FieldLabel>
        <Input
          id={nameId}
          name="name"
          required
          maxLength={256}
          defaultValue={plan?.name}
        />
        {fieldErrors?.name ? <FieldError>{fieldErrors.name}</FieldError> : null}
      </Field>

      <Field>
        <FieldLabel htmlFor={descId}>{t("fieldDescription")}</FieldLabel>
        <Textarea
          id={descId}
          name="description"
          rows={3}
          defaultValue={plan?.description ?? ""}
        />
      </Field>

      <Field>
        <FieldLabel htmlFor={kindId}>{t("fieldBenefitKind")}</FieldLabel>
        <select
          id={kindId}
          name="benefitKind"
          className={SELECT_CLASS}
          required
          defaultValue={plan?.benefitKind ?? "medical"}
        >
          {BENEFIT_KINDS.map((k) => (
            <option key={k} value={k}>
              {t(`kinds.${k}`)}
            </option>
          ))}
        </select>
        {fieldErrors?.benefitKind ? (
          <FieldError>{fieldErrors.benefitKind}</FieldError>
        ) : null}
      </Field>

      <Field>
        <FieldLabel htmlFor={typeId}>{t("fieldBenefitType")}</FieldLabel>
        <Input
          id={typeId}
          name="benefitType"
          maxLength={128}
          placeholder={t("fieldBenefitTypePlaceholder")}
          defaultValue={plan?.benefitType ?? ""}
        />
        {fieldErrors?.benefitType ? (
          <FieldError>{fieldErrors.benefitType}</FieldError>
        ) : null}
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor={erTypeId}>
            {t("fieldEmployerContributionType")}
          </FieldLabel>
          <select
            id={erTypeId}
            name="employerContributionType"
            className={SELECT_CLASS}
            defaultValue={plan?.employerContributionType ?? "none"}
          >
            {BENEFIT_CONTRIBUTION_TYPES.map((k) => (
              <option key={k} value={k}>
                {t(`contributionTypes.${k}`)}
              </option>
            ))}
          </select>
          {fieldErrors?.employerContributionType ? (
            <FieldError>{fieldErrors.employerContributionType}</FieldError>
          ) : null}
        </Field>
        <Field>
          <FieldLabel htmlFor={erValId}>
            {t("fieldEmployerContributionValue")}
          </FieldLabel>
          <Input
            id={erValId}
            name="employerContributionValue"
            type="number"
            min={0}
            step="0.0001"
            defaultValue={parseOptionalNumber(
              plan?.employerContributionValue ?? undefined
            )}
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor={empTypeId}>
            {t("fieldEmployeeContributionType")}
          </FieldLabel>
          <select
            id={empTypeId}
            name="employeeContributionType"
            className={SELECT_CLASS}
            defaultValue={plan?.employeeContributionType ?? "none"}
          >
            {BENEFIT_CONTRIBUTION_TYPES.map((k) => (
              <option key={k} value={k}>
                {t(`contributionTypes.${k}`)}
              </option>
            ))}
          </select>
          {fieldErrors?.employeeContributionType ? (
            <FieldError>{fieldErrors.employeeContributionType}</FieldError>
          ) : null}
        </Field>
        <Field>
          <FieldLabel htmlFor={empValId}>
            {t("fieldEmployeeContributionValue")}
          </FieldLabel>
          <Input
            id={empValId}
            name="employeeContributionValue"
            type="number"
            min={0}
            step="0.0001"
            defaultValue={parseOptionalNumber(
              plan?.employeeContributionValue ?? undefined
            )}
          />
        </Field>
      </div>

      <Field>
        <FieldLabel>{t("fieldCoverageLevels")}</FieldLabel>
        <FieldDescription>{t("fieldCoverageLevelsHint")}</FieldDescription>
        <ul className="mt-2 flex flex-col gap-2">
          {BENEFIT_COVERAGE_LEVELS.map((level) => (
            <li key={level} className="flex items-center gap-2">
              <input
                id={`coverage-${level}`}
                type="checkbox"
                name="coverageLevels"
                value={level}
                defaultChecked={selectedLevels.has(level)}
                className="size-4 rounded border border-border"
              />
              <label htmlFor={`coverage-${level}`} className="text-sm">
                {t(`coverageLevels.${level}`)}
              </label>
            </li>
          ))}
        </ul>
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor={waitId}>
            {t("fieldWaitingPeriodDays")}
          </FieldLabel>
          <Input
            id={waitId}
            name="waitingPeriodDays"
            type="number"
            min={0}
            max={3650}
            defaultValue={plan?.waitingPeriodDays ?? 0}
          />
          {fieldErrors?.waitingPeriodDays ? (
            <FieldError>{fieldErrors.waitingPeriodDays}</FieldError>
          ) : null}
        </Field>
        <Field>
          <FieldLabel htmlFor={maxId}>{t("fieldMaxAnnualAmount")}</FieldLabel>
          <Input
            id={maxId}
            name="maxAnnualAmount"
            type="number"
            min={0}
            step="0.01"
            defaultValue={parseOptionalNumber(
              plan?.maxAnnualAmount ?? undefined
            )}
          />
        </Field>
      </div>

      <Field>
        <FieldLabel htmlFor={effId}>{t("fieldEffectiveFrom")}</FieldLabel>
        <Input
          id={effId}
          name="effectiveFrom"
          type="date"
          defaultValue={isoDateOnly(plan?.effectiveFrom)}
        />
        {fieldErrors?.effectiveFrom ? (
          <FieldError>{fieldErrors.effectiveFrom}</FieldError>
        ) : null}
      </Field>

      <Button type="submit" disabled={pending} className="self-start">
        {pending ? (
          <>
            <Loader2
              className="size-4 animate-spin"
              data-icon="inline-start"
              aria-hidden
            />
            {mode === "create" ? t("submitCreating") : t("submitUpdating")}
          </>
        ) : mode === "create" ? (
          t("submitCreate")
        ) : (
          t("submitUpdate")
        )}
      </Button>
    </form>
  )
}
