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

import {
  submitClaimOnBehalfAction,
  submitOwnClaimAction,
  type SubmitClaimFormState,
} from "#features/hrm/client"

import type { LeaveEmployeeChoiceRow } from "../data/leave-request.queries.server"
import type { ClaimTypeRow } from "../data/claim.queries.server"

type ClaimSubmitFormProps = {
  mode: "own" | "on_behalf"
  employees: ReadonlyArray<LeaveEmployeeChoiceRow>
  claimTypes: ReadonlyArray<ClaimTypeRow>
  onSuccess?: () => void
}

const SELECT_CLASS =
  "h-9 w-full rounded border border-border bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-50"

/**
 * Submit-claim form body. Mirrors `LeaveApplyForm` shape — lives outside
 * the parent dialog so the cross-boundary `onSuccess` callback reads as a
 * normal function.
 */
export function ClaimSubmitForm({
  mode,
  employees,
  claimTypes,
  onSuccess,
}: ClaimSubmitFormProps) {
  const t = useTranslations("Dashboard.Hrm.claims")
  const action =
    mode === "own" ? submitOwnClaimAction : submitClaimOnBehalfAction
  const [state, formAction, pending] = useActionState<
    SubmitClaimFormState | undefined,
    FormData
  >(action, undefined)

  const employeeId = useId()
  const claimTypeId = useId()
  const claimDateId = useId()
  const amountId = useId()
  const descriptionId = useId()

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

      {mode === "on_behalf" ? (
        <Field data-invalid={fieldErrors?.employeeId ? true : undefined}>
          <FieldLabel htmlFor={employeeId}>{t("fieldEmployee")}</FieldLabel>
          <select
            id={employeeId}
            name="employeeId"
            required
            defaultValue=""
            className={SELECT_CLASS}
            aria-invalid={Boolean(fieldErrors?.employeeId)}
          >
            <option value="" disabled>
              {t("fieldEmployeePlaceholder")}
            </option>
            {employees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.legalName} · {employee.employeeNumber}
              </option>
            ))}
          </select>
          {fieldErrors?.employeeId ? (
            <FieldError>{fieldErrors.employeeId}</FieldError>
          ) : null}
        </Field>
      ) : null}

      <Field data-invalid={fieldErrors?.claimTypeId ? true : undefined}>
        <FieldLabel htmlFor={claimTypeId}>{t("fieldClaimType")}</FieldLabel>
        <select
          id={claimTypeId}
          name="claimTypeId"
          required
          defaultValue=""
          className={SELECT_CLASS}
          aria-invalid={Boolean(fieldErrors?.claimTypeId)}
        >
          <option value="" disabled>
            {t("fieldClaimTypePlaceholder")}
          </option>
          {claimTypes.map((claimType) => (
            <option key={claimType.id} value={claimType.id}>
              {claimType.code} — {claimType.currency}
            </option>
          ))}
        </select>
        {fieldErrors?.claimTypeId ? (
          <FieldError>{fieldErrors.claimTypeId}</FieldError>
        ) : null}
      </Field>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field data-invalid={fieldErrors?.claimDate ? true : undefined}>
          <FieldLabel htmlFor={claimDateId}>{t("fieldClaimDate")}</FieldLabel>
          <Input
            id={claimDateId}
            name="claimDate"
            type="date"
            required
            aria-invalid={Boolean(fieldErrors?.claimDate)}
          />
          <FieldDescription>{t("fieldClaimDateHint")}</FieldDescription>
          {fieldErrors?.claimDate ? (
            <FieldError>{fieldErrors.claimDate}</FieldError>
          ) : null}
        </Field>

        <Field data-invalid={fieldErrors?.amount ? true : undefined}>
          <FieldLabel htmlFor={amountId}>{t("fieldAmount")}</FieldLabel>
          <Input
            id={amountId}
            name="amount"
            type="number"
            min="0.01"
            max="1000000000"
            step="0.01"
            required
            aria-invalid={Boolean(fieldErrors?.amount)}
          />
          {fieldErrors?.amount ? (
            <FieldError>{fieldErrors.amount}</FieldError>
          ) : null}
        </Field>
      </div>

      <Field>
        <FieldLabel htmlFor={descriptionId}>{t("fieldDescription")}</FieldLabel>
        <textarea
          id={descriptionId}
          name="description"
          rows={3}
          maxLength={2000}
          placeholder={t("fieldDescriptionPlaceholder")}
          className="min-h-[72px] w-full rounded border border-border bg-background px-2 py-1.5 text-sm focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
        />
      </Field>

      <Button type="submit" disabled={pending} className="self-start">
        {pending ? (
          <>
            <Loader2
              className="size-4 animate-spin"
              data-icon="inline-start"
              aria-hidden
            />
            {t("submitSubmitting")}
          </>
        ) : (
          t("submitSubmit")
        )}
      </Button>
    </form>
  )
}
