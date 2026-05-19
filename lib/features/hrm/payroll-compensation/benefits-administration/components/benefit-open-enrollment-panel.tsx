"use client"

import { useActionState, useEffect, useId, useRef } from "react"
import { useTranslations } from "next-intl"
import { Loader2 } from "lucide-react"

import { Alert, AlertDescription } from "#components2/ui/alert"
import { Button } from "#components2/ui/button"
import { Field, FieldLabel } from "#components2/ui/field"
import { Input } from "#components2/ui/input"
import { useRouter } from "#i18n/navigation"

import { createBenefitOpenEnrollmentAction } from "../actions/benefit-open-enrollment.actions"
import type { BenefitOpenEnrollmentFormState } from "../actions/benefit-open-enrollment.actions"

import type { BenefitPlanChoiceRow } from "./benefit-enrollment-form"

type BenefitOpenEnrollmentPanelProps = {
  isAdmin: boolean
  plans: readonly BenefitPlanChoiceRow[]
}

export function BenefitOpenEnrollmentPanel({
  isAdmin,
  plans,
}: BenefitOpenEnrollmentPanelProps) {
  const t = useTranslations("Dashboard.Hrm.benefits")

  if (!isAdmin) {
    return (
      <p className="text-sm text-muted-foreground">
        {t("openEnrollment.memberReadOnly")}
      </p>
    )
  }

  return <CreateOpenEnrollmentForm plans={plans} />
}

function CreateOpenEnrollmentForm({
  plans,
}: {
  plans: readonly BenefitPlanChoiceRow[]
}) {
  const t = useTranslations("Dashboard.Hrm.benefits")
  const [state, formAction, pending] = useActionState<
    BenefitOpenEnrollmentFormState | undefined,
    FormData
  >(createBenefitOpenEnrollmentAction, undefined)

  const nameId = useId()
  const startsId = useId()
  const endsId = useId()
  const router = useRouter()
  const did = useRef(false)

  useEffect(() => {
    if (state?.ok && !did.current) {
      did.current = true
      router.refresh()
    }
  }, [state, router])

  const err = state && !state.ok ? state.errors : null

  return (
    <form
      action={formAction}
      className="flex flex-col gap-4 rounded-md border border-border p-4"
    >
      <h3 className="text-sm font-medium">{t("openEnrollment.createTitle")}</h3>
      {err?.form ? (
        <Alert variant="destructive">
          <AlertDescription>{err.form}</AlertDescription>
        </Alert>
      ) : null}
      <Field>
        <FieldLabel htmlFor={nameId}>
          {t("openEnrollment.fieldName")}
        </FieldLabel>
        <Input id={nameId} name="name" required maxLength={256} />
        {err?.name ? (
          <p className="text-xs text-destructive">{err.name}</p>
        ) : null}
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor={startsId}>
            {t("openEnrollment.fieldStartsOn")}
          </FieldLabel>
          <Input id={startsId} name="startsOn" type="date" required />
          {err?.startsOn ? (
            <p className="text-xs text-destructive">{err.startsOn}</p>
          ) : null}
        </Field>
        <Field>
          <FieldLabel htmlFor={endsId}>
            {t("openEnrollment.fieldEndsOn")}
          </FieldLabel>
          <Input id={endsId} name="endsOn" type="date" required />
          {err?.endsOn ? (
            <p className="text-xs text-destructive">{err.endsOn}</p>
          ) : null}
        </Field>
      </div>
      {plans.length > 0 ? (
        <Field>
          <FieldLabel>{t("openEnrollment.fieldPlans")}</FieldLabel>
          <p className="mb-2 text-xs text-muted-foreground">
            {t("openEnrollment.fieldPlansHint")}
          </p>
          <div className="flex flex-col gap-2">
            {plans.map((plan) => (
              <label key={plan.id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="planIds" value={plan.id} />
                <span>
                  {plan.code} — {plan.name}
                </span>
              </label>
            ))}
          </div>
        </Field>
      ) : null}
      <Button type="submit" disabled={pending} className="self-start">
        {pending ? (
          <>
            <Loader2
              className="size-4 animate-spin"
              data-icon="inline-start"
              aria-hidden
            />
            {t("openEnrollment.creating")}
          </>
        ) : (
          t("openEnrollment.createSubmit")
        )}
      </Button>
    </form>
  )
}
