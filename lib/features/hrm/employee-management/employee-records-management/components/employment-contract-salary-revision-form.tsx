"use client"

import { useActionState } from "react"
import { useTranslations } from "next-intl"
import { Loader2 } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "#components2/ui/alert"
import { Button } from "#components2/ui/button"
import { Field, FieldError, FieldLabel } from "#components2/ui/field"
import { Input } from "#components2/ui/input"

import { createSalaryRevisionDraftAction } from "#features/hrm/client"

type EmploymentContractSalaryRevisionFormProps = {
  orgSlug: string
  employeeId: string
  hasActiveContract: boolean
}

export function EmploymentContractSalaryRevisionForm({
  orgSlug,
  employeeId,
  hasActiveContract,
}: EmploymentContractSalaryRevisionFormProps) {
  const t = useTranslations("Dashboard.Hrm.workforce")
  const [state, formAction, pending] = useActionState(
    createSalaryRevisionDraftAction,
    undefined
  )

  if (!hasActiveContract) {
    return null
  }

  return (
    <div className="rounded-lg border border-border bg-muted/10 p-4">
      <p className="text-sm font-medium">{t("contractSalaryRevisionTitle")}</p>
      <p className="mt-1 text-xs text-muted-foreground">
        {t("contractSalaryRevisionHint")}
      </p>
      <form action={formAction} className="mt-3 flex flex-col gap-3">
        <input type="hidden" name="orgSlug" value={orgSlug} />
        <input type="hidden" name="employeeId" value={employeeId} />

        {state && !state.ok && state.errors.form ? (
          <Alert variant="destructive">
            <AlertTitle>{t("errorTitle")}</AlertTitle>
            <AlertDescription>{state.errors.form}</AlertDescription>
          </Alert>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2">
          <Field
            data-invalid={state && !state.ok && state.errors.effectiveFrom}
          >
            <FieldLabel htmlFor="salary-revision-effective-from">
              {t("contractEffectiveFrom")}
            </FieldLabel>
            <Input
              id="salary-revision-effective-from"
              name="effectiveFrom"
              type="date"
              required
            />
            {state && !state.ok && state.errors.effectiveFrom ? (
              <FieldError>{state.errors.effectiveFrom}</FieldError>
            ) : null}
          </Field>
          <Field>
            <FieldLabel htmlFor="salary-revision-amount">
              {t("contractNewSalary")}
            </FieldLabel>
            <Input
              id="salary-revision-amount"
              name="newBaseSalaryAmount"
              inputMode="decimal"
              placeholder="5000.00"
              required
            />
          </Field>
        </div>

        <Button type="submit" disabled={pending} variant="secondary">
          {pending ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden />
              {t("contractCreatingDraft")}
            </>
          ) : (
            t("contractSalaryRevisionSubmit")
          )}
        </Button>
      </form>
    </div>
  )
}
