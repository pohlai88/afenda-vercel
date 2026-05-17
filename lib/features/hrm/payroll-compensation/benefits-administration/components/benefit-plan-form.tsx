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
} from "../actions/benefit-plan.actions"
import type { BenefitPlanMutationFormState } from "../../../types"

import {
  BENEFIT_CATEGORIES,
  BENEFIT_CONTRIBUTION_TYPES,
  BENEFIT_COVERAGE_LEVELS,
  BENEFIT_KIND_DEFAULT_CATEGORY,
  BENEFIT_KINDS,
} from "../data/benefit-helpers.shared"
import type { BenefitPlanRow } from "../data/benefit-model.shared"
import { readPlanEligibilityFlag } from "../data/benefit-plan-input.shared"

export type BenefitProviderChoice = {
  id: string
  code: string
  name: string
}

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
  providers?: readonly BenefitProviderChoice[]
  onSuccess?: () => void
}

function formatScopeCodes(values: readonly string[] | null | undefined): string {
  if (!values?.length) return ""
  return values.join(", ")
}

export function BenefitPlanForm({
  mode,
  plan,
  providers = [],
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
  const categoryId = useId()
  const typeId = useId()
  const planYearId = useId()
  const carrierId = useId()
  const providerNameId = useId()
  const benefitProviderId = useId()
  const scopeCountriesId = useId()
  const scopeLegalEntitiesId = useId()
  const requiresApprovalId = useId()
  const newHireAutoEnrollId = useId()
  const policyId = useId()
  const rateVersionId = useId()
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
        <FieldLabel htmlFor={categoryId}>{t("fieldBenefitCategory")}</FieldLabel>
        <select
          id={categoryId}
          name="benefitCategory"
          className={SELECT_CLASS}
          defaultValue={
            plan?.benefitCategory ??
            BENEFIT_KIND_DEFAULT_CATEGORY[
              (plan?.benefitKind ?? "medical") as (typeof BENEFIT_KINDS)[number]
            ]
          }
        >
          {BENEFIT_CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {t(`categories.${category}`)}
            </option>
          ))}
        </select>
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
          <FieldLabel htmlFor={planYearId}>{t("fieldPlanYear")}</FieldLabel>
          <Input
            id={planYearId}
            name="planYear"
            type="number"
            min={1900}
            max={2200}
            defaultValue={plan?.planYear ?? ""}
          />
          {fieldErrors?.planYear ? (
            <FieldError>{fieldErrors.planYear}</FieldError>
          ) : null}
        </Field>
        <Field>
          <FieldLabel htmlFor={rateVersionId}>
            {t("fieldRateTableVersion")}
          </FieldLabel>
          <Input
            id={rateVersionId}
            name="rateTableVersion"
            maxLength={128}
            defaultValue={plan?.rateTableVersion ?? ""}
          />
          {fieldErrors?.rateTableVersion ? (
            <FieldError>{fieldErrors.rateTableVersion}</FieldError>
          ) : null}
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field>
          <FieldLabel htmlFor={carrierId}>{t("fieldCarrierName")}</FieldLabel>
          <Input
            id={carrierId}
            name="carrierName"
            maxLength={256}
            defaultValue={plan?.carrierName ?? ""}
          />
          {fieldErrors?.carrierName ? (
            <FieldError>{fieldErrors.carrierName}</FieldError>
          ) : null}
        </Field>
        <Field>
          <FieldLabel htmlFor={providerNameId}>
            {t("fieldProviderName")}
          </FieldLabel>
          <Input
            id={providerNameId}
            name="providerName"
            maxLength={256}
            defaultValue={plan?.providerName ?? ""}
          />
          {fieldErrors?.providerName ? (
            <FieldError>{fieldErrors.providerName}</FieldError>
          ) : null}
        </Field>
        <Field>
          <FieldLabel htmlFor={policyId}>
            {t("fieldPolicyReference")}
          </FieldLabel>
          <Input
            id={policyId}
            name="policyReference"
            maxLength={256}
            defaultValue={plan?.policyReference ?? ""}
          />
          {fieldErrors?.policyReference ? (
            <FieldError>{fieldErrors.policyReference}</FieldError>
          ) : null}
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor={benefitProviderId}>
            {t("fieldBenefitProvider")}
          </FieldLabel>
          <select
            id={benefitProviderId}
            name="providerId"
            className={SELECT_CLASS}
            defaultValue={plan?.providerId ?? ""}
          >
            <option value="">{t("fieldBenefitProviderNone")}</option>
            {providers.map((provider) => (
              <option key={provider.id} value={provider.id}>
                {provider.code} — {provider.name}
              </option>
            ))}
          </select>
        </Field>
        <Field>
          <FieldLabel htmlFor={scopeCountriesId}>
            {t("fieldScopeCountries")}
          </FieldLabel>
          <Input
            id={scopeCountriesId}
            name="scopeCountryCodes"
            maxLength={2000}
            defaultValue={formatScopeCodes(plan?.scopeCountryCodes)}
          />
          <FieldDescription>{t("fieldScopeCountriesHint")}</FieldDescription>
        </Field>
      </div>

      <Field>
        <FieldLabel htmlFor={scopeLegalEntitiesId}>
          {t("fieldScopeLegalEntities")}
        </FieldLabel>
        <Input
          id={scopeLegalEntitiesId}
          name="scopeLegalEntityCodes"
          maxLength={2000}
          defaultValue={formatScopeCodes(plan?.scopeLegalEntityCodes)}
        />
        <FieldDescription>{t("fieldScopeLegalEntitiesHint")}</FieldDescription>
      </Field>

      <div className="flex flex-col gap-3 rounded-md border border-border p-3">
        <input type="hidden" name="requiresEnrollmentApproval" value="false" />
        <div className="flex items-start gap-2">
          <input
            id={requiresApprovalId}
            type="checkbox"
            name="requiresEnrollmentApproval"
            value="true"
            defaultChecked={readPlanEligibilityFlag(
              plan?.eligibilityRules,
              "requiresEnrollmentApproval"
            )}
            className="mt-1 size-4 rounded border border-border"
          />
          <label htmlFor={requiresApprovalId} className="text-sm">
            {t("fieldRequiresEnrollmentApproval")}
          </label>
        </div>
        <input type="hidden" name="newHireAutoEnroll" value="false" />
        <div className="flex items-start gap-2">
          <input
            id={newHireAutoEnrollId}
            type="checkbox"
            name="newHireAutoEnroll"
            value="true"
            defaultChecked={readPlanEligibilityFlag(
              plan?.eligibilityRules,
              "newHireAutoEnroll"
            )}
            className="mt-1 size-4 rounded border border-border"
          />
          <label htmlFor={newHireAutoEnrollId} className="text-sm">
            {t("fieldNewHireAutoEnroll")}
          </label>
        </div>
      </div>

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
