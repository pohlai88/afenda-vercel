"use client"

import { useActionState, useEffect, useId, useMemo, useRef } from "react"
import { useTranslations } from "next-intl"
import { Loader2 } from "lucide-react"

import { useRouter } from "#i18n/navigation"
import { Alert, AlertDescription, AlertTitle } from "#components/ui/alert"
import { Button } from "#components/ui/button"
import { Field, FieldError, FieldLabel } from "#components/ui/field"
import { Input } from "#components/ui/input"
import {
  submitPortalEmployeeClaimAction,
  type SubmitClaimFormState,
} from "#features/hrm/client"

export type EmployeePortalClaimTypeOption = {
  readonly id: string
  readonly code: string
  readonly name: string
  readonly currency: string
}

type EmployeePortalClaimSubmitFormProps = {
  portalSlug: string
  claimTypes: ReadonlyArray<EmployeePortalClaimTypeOption>
  onSuccess?: () => void
}

const SELECT_CLASS =
  "h-9 w-full rounded border border-border bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-50"

export function EmployeePortalClaimSubmitForm({
  portalSlug,
  claimTypes,
  onSuccess,
}: EmployeePortalClaimSubmitFormProps) {
  const t = useTranslations("Dashboard.Hrm.portalClaims")
  const router = useRouter()
  const [state, formAction, pending] = useActionState<
    SubmitClaimFormState | undefined,
    FormData
  >(submitPortalEmployeeClaimAction, undefined)

  const claimTypeId = useId()
  const claimDateId = useId()
  const amountId = useId()
  const currencyId = useId()
  const descriptionId = useId()

  const onSuccessRef = useRef(onSuccess)
  useEffect(() => {
    onSuccessRef.current = onSuccess
  }, [onSuccess])

  useEffect(() => {
    if (state?.ok) {
      onSuccessRef.current?.()
      router.refresh()
    }
  }, [state, router])

  const fieldErrors = useMemo(() => {
    if (!state || state.ok) return null
    return state.errors
  }, [state])

  const defaultCurrency = claimTypes[0]?.currency ?? ""

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="portalSlug" value={portalSlug} />

      {fieldErrors?.form ? (
        <Alert variant="destructive">
          <AlertTitle>{t("errorTitle")}</AlertTitle>
          <AlertDescription>{fieldErrors.form}</AlertDescription>
        </Alert>
      ) : null}

      <Field data-invalid={fieldErrors?.claimTypeId ? true : undefined}>
        <FieldLabel htmlFor={claimTypeId}>{t("fieldClaimType")}</FieldLabel>
        <select
          id={claimTypeId}
          name="claimTypeId"
          required
          className={SELECT_CLASS}
          defaultValue=""
        >
          <option value="" disabled>
            …
          </option>
          {claimTypes.map((row) => (
            <option key={row.id} value={row.id}>
              {row.name} ({row.code})
            </option>
          ))}
        </select>
        {fieldErrors?.claimTypeId ? (
          <FieldError>{fieldErrors.claimTypeId}</FieldError>
        ) : null}
      </Field>

      <Field data-invalid={fieldErrors?.claimDate ? true : undefined}>
        <FieldLabel htmlFor={claimDateId}>{t("fieldClaimDate")}</FieldLabel>
        <Input
          id={claimDateId}
          name="claimDate"
          type="date"
          required
          className="h-9"
        />
        {fieldErrors?.claimDate ? (
          <FieldError>{fieldErrors.claimDate}</FieldError>
        ) : null}
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field data-invalid={fieldErrors?.amount ? true : undefined}>
          <FieldLabel htmlFor={amountId}>{t("fieldAmount")}</FieldLabel>
          <Input
            id={amountId}
            name="amount"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            required
            className="h-9"
          />
          {fieldErrors?.amount ? (
            <FieldError>{fieldErrors.amount}</FieldError>
          ) : null}
        </Field>
        <Field data-invalid={fieldErrors?.currency ? true : undefined}>
          <FieldLabel htmlFor={currencyId}>{t("fieldCurrency")}</FieldLabel>
          <Input
            id={currencyId}
            name="currency"
            defaultValue={defaultCurrency}
            maxLength={8}
            className="h-9"
          />
          {fieldErrors?.currency ? (
            <FieldError>{fieldErrors.currency}</FieldError>
          ) : null}
        </Field>
      </div>

      <Field>
        <FieldLabel htmlFor={descriptionId}>{t("fieldDescription")}</FieldLabel>
        <Input id={descriptionId} name="description" className="h-9" />
      </Field>

      <Button
        type="submit"
        className="min-h-11"
        disabled={pending || claimTypes.length === 0}
      >
        {pending ? (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />…
          </>
        ) : (
          t("submit")
        )}
      </Button>
    </form>
  )
}
