"use client"

import { useActionState, useEffect, useId, useMemo, useRef } from "react"
import { useTranslations } from "next-intl"
import { Loader2 } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "#components2/ui/alert"
import { Button } from "#components2/ui/button"
import { Field, FieldLabel } from "#components2/ui/field"
import { Input } from "#components2/ui/input"

import { createBenefitClaimReferenceAction } from "../client"
import { BENEFIT_CLAIM_STATUSES } from "../data/benefit-helpers.shared"
import type { BenefitEnrollmentTransitionFormState } from "../../../types"

const SELECT_CLASS =
  "h-9 w-full rounded border border-border bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-50"

export type BenefitEnrollmentChoice = {
  id: string
  label: string
}

export type BenefitProviderChoice = {
  id: string
  code: string
  name: string
}

type BenefitClaimReferenceFormProps = {
  enrollments: readonly BenefitEnrollmentChoice[]
  providers: readonly BenefitProviderChoice[]
  onSuccess?: () => void
}

export function BenefitClaimReferenceForm({
  enrollments,
  providers,
  onSuccess,
}: BenefitClaimReferenceFormProps) {
  const t = useTranslations("Dashboard.Hrm.benefits.claimReferenceForm")
  const [state, formAction, pending] = useActionState<
    BenefitEnrollmentTransitionFormState | undefined,
    FormData
  >(createBenefitClaimReferenceAction, undefined)

  const enrollmentId = useId()
  const providerId = useId()
  const externalClaimId = useId()
  const claimStatusId = useId()
  const claimedAmountId = useId()
  const currencyId = useId()
  const paymentReferenceId = useId()

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
        <FieldLabel htmlFor={enrollmentId}>{t("fieldEnrollment")}</FieldLabel>
        <select
          id={enrollmentId}
          name="enrollmentId"
          className={SELECT_CLASS}
          required
          defaultValue=""
        >
          <option value="" disabled>
            {t("fieldEnrollmentPlaceholder")}
          </option>
          {enrollments.map((enrollment) => (
            <option key={enrollment.id} value={enrollment.id}>
              {enrollment.label}
            </option>
          ))}
        </select>
      </Field>

      <Field>
        <FieldLabel htmlFor={providerId}>{t("fieldProvider")}</FieldLabel>
        <select
          id={providerId}
          name="providerId"
          className={SELECT_CLASS}
          defaultValue=""
        >
          <option value="">{t("fieldProviderNone")}</option>
          {providers.map((provider) => (
            <option key={provider.id} value={provider.id}>
              {provider.code} — {provider.name}
            </option>
          ))}
        </select>
      </Field>

      <Field>
        <FieldLabel htmlFor={externalClaimId}>
          {t("fieldExternalClaimId")}
        </FieldLabel>
        <Input
          id={externalClaimId}
          name="externalClaimId"
          maxLength={128}
          required
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor={claimStatusId}>
            {t("fieldClaimStatus")}
          </FieldLabel>
          <select
            id={claimStatusId}
            name="claimStatus"
            className={SELECT_CLASS}
            defaultValue="submitted"
          >
            {BENEFIT_CLAIM_STATUSES.map((status) => (
              <option key={status} value={status}>
                {t(`claimStatuses.${status}`)}
              </option>
            ))}
          </select>
        </Field>
        <Field>
          <FieldLabel htmlFor={currencyId}>{t("fieldCurrency")}</FieldLabel>
          <Input
            id={currencyId}
            name="currency"
            maxLength={3}
            defaultValue="MYR"
            required
          />
        </Field>
      </div>

      <Field>
        <FieldLabel htmlFor={claimedAmountId}>
          {t("fieldClaimedAmount")}
        </FieldLabel>
        <Input
          id={claimedAmountId}
          name="claimedAmount"
          type="number"
          min={0}
          step="0.01"
        />
      </Field>

      <Field>
        <FieldLabel htmlFor={paymentReferenceId}>
          {t("fieldPaymentReference")}
        </FieldLabel>
        <Input
          id={paymentReferenceId}
          name="paymentReference"
          maxLength={256}
        />
      </Field>

      <Button type="submit" disabled={pending || enrollments.length === 0}>
        {pending ? (
          <>
            <Loader2
              className="size-4 animate-spin"
              data-icon="inline-start"
              aria-hidden
            />
            {t("submitCreating")}
          </>
        ) : (
          t("submitCreate")
        )}
      </Button>
    </form>
  )
}
