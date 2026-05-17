"use client"

import { useActionState } from "react"
import { useTranslations } from "next-intl"

import { Alert, AlertDescription } from "#components2/ui/alert"
import { Button } from "#components2/ui/button"
import { Field, FieldError, FieldLabel } from "#components2/ui/field"
import { Input } from "#components2/ui/input"
import { updatePortalBankingProfileAction } from "#features/hrm/client"
import type { EmployeeMasterMutationFormState } from "#features/hrm/types"

type EmployeePortalProfileBankingFormProps = {
  portalSlug: string
  defaults: {
    bankCode: string
    bankAccountHolderName: string
    bankAccountTokenized: string
  }
}

export function EmployeePortalProfileBankingForm({
  portalSlug,
  defaults,
}: EmployeePortalProfileBankingFormProps) {
  const t = useTranslations("Dashboard.Hrm.portalProfile")
  const [state, formAction, pending] = useActionState<
    EmployeeMasterMutationFormState | undefined,
    FormData
  >(updatePortalBankingProfileAction, undefined)

  return (
    <form action={formAction} className="flex max-w-lg flex-col gap-4">
      <input type="hidden" name="portalSlug" value={portalSlug} />

      <Alert>
        <AlertDescription>{t("bankingStepUpHint")}</AlertDescription>
      </Alert>

      {state?.ok ? (
        <Alert>
          <AlertDescription>{t("saveSuccess")}</AlertDescription>
        </Alert>
      ) : null}

      {state && !state.ok && state.errors.form ? (
        <Alert variant="destructive">
          <AlertDescription>{state.errors.form}</AlertDescription>
        </Alert>
      ) : null}

      <Field>
        <FieldLabel htmlFor="bankCode">{t("bankCode")}</FieldLabel>
        <Input id="bankCode" name="bankCode" defaultValue={defaults.bankCode} />
      </Field>

      <Field>
        <FieldLabel htmlFor="bankAccountHolderName">
          {t("bankAccountHolderName")}
        </FieldLabel>
        <Input
          id="bankAccountHolderName"
          name="bankAccountHolderName"
          defaultValue={defaults.bankAccountHolderName}
        />
      </Field>

      <Field>
        <FieldLabel htmlFor="bankAccountTokenized">
          {t("bankAccountTokenized")}
        </FieldLabel>
        <Input
          id="bankAccountTokenized"
          name="bankAccountTokenized"
          defaultValue={defaults.bankAccountTokenized}
        />
        <p className="text-xs text-muted-foreground">{t("bankTokenHint")}</p>
      </Field>

      {state && !state.ok && state.errors.form ? (
        <FieldError>{state.errors.form}</FieldError>
      ) : null}

      <Button type="submit" className="min-h-11 w-fit" disabled={pending}>
        {pending ? t("saving") : t("save")}
      </Button>
    </form>
  )
}
