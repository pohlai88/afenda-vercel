"use client"

import { useActionState, useEffect, useId, useRef } from "react"
import { useTranslations } from "next-intl"
import { Loader2 } from "lucide-react"

import { Alert, AlertDescription } from "#components/ui/alert"
import { Button } from "#components/ui/button"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "#components/ui/field"
import { Input } from "#components/ui/input"
import {
  submitEmployeePortalEnrollBenefit,
  type BenefitEnrollFormState,
} from "#features/hrm/client"
import { BENEFIT_COVERAGE_LEVELS } from "../data/benefit-helpers.shared"

import type { BenefitAvailableToEmployeeRow } from "../data/benefit.queries.server"

type EmployeePortalBenefitEnrollFormProps = {
  portalSlug: string
  availablePlans: readonly BenefitAvailableToEmployeeRow[]
}

const SELECT_CLASS =
  "h-9 w-full rounded border border-border bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-50"

export function EmployeePortalBenefitEnrollForm({
  portalSlug,
  availablePlans,
}: EmployeePortalBenefitEnrollFormProps) {
  const t = useTranslations("Dashboard.Hrm.portalBenefits")
  const enrollable = availablePlans.filter(
    (row) => row.eligible && !row.hasOpenEnrollment
  )

  const [state, formAction, pending] = useActionState<
    BenefitEnrollFormState | undefined,
    FormData
  >(submitEmployeePortalEnrollBenefit, undefined)

  const planId = useId()
  const coverageId = useId()
  const effectiveId = useId()
  const onSuccessRef = useRef<() => void>(undefined)

  useEffect(() => {
    if (state?.ok) onSuccessRef.current?.()
  }, [state])

  if (enrollable.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">{t("availableEmpty")}</p>
    )
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="portalSlug" value={portalSlug} />

      {state && !state.ok && state.errors.form ? (
        <Alert variant="destructive">
          <AlertDescription>{state.errors.form}</AlertDescription>
        </Alert>
      ) : null}

      <Field>
        <FieldLabel htmlFor={planId}>{t("enrollPlan")}</FieldLabel>
        <select
          id={planId}
          name="planId"
          required
          disabled={pending}
          className={SELECT_CLASS}
          defaultValue=""
        >
          <option value="" disabled>
            {t("enrollPlanPlaceholder")}
          </option>
          {enrollable.map((row) => (
            <option key={row.plan.id} value={row.plan.id}>
              {row.plan.name} ({row.plan.code})
            </option>
          ))}
        </select>
        {state && !state.ok && state.errors.planId ? (
          <FieldError>{state.errors.planId}</FieldError>
        ) : null}
      </Field>

      <Field>
        <FieldLabel htmlFor={coverageId}>{t("enrollCoverage")}</FieldLabel>
        <select
          id={coverageId}
          name="coverageLevel"
          required
          disabled={pending}
          className={SELECT_CLASS}
          defaultValue={BENEFIT_COVERAGE_LEVELS[0]}
        >
          {BENEFIT_COVERAGE_LEVELS.map((level) => (
            <option key={level} value={level}>
              {t(`coverageLevel.${level}`)}
            </option>
          ))}
        </select>
        {state && !state.ok && state.errors.coverageLevel ? (
          <FieldError>{state.errors.coverageLevel}</FieldError>
        ) : null}
      </Field>

      <Field>
        <FieldLabel htmlFor={effectiveId}>{t("enrollEffective")}</FieldLabel>
        <Input
          id={effectiveId}
          name="effectiveFrom"
          type="date"
          disabled={pending}
        />
        <FieldDescription>{t("enrollEffectiveHelp")}</FieldDescription>
      </Field>

      <Button type="submit" disabled={pending}>
        {pending ? (
          <>
            <Loader2 className="size-4 animate-spin" aria-hidden />
            {t("enrollSubmitting")}
          </>
        ) : (
          t("enrollSubmit")
        )}
      </Button>
    </form>
  )
}
