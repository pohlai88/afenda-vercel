"use client"

import { useActionState, useEffect, useId, useMemo, useRef } from "react"
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

import {
  createBenefitProviderAction,
  updateBenefitProviderAction,
} from "../client"
import type { BenefitPlanMutationFormState } from "../../../types"

export type BenefitProviderFormRow = {
  id: string
  code: string
  name: string
  countryCodes: string[]
  externalReference: string | null
  isActive: boolean
}

type BenefitProviderFormProps = {
  mode: "create" | "edit"
  provider?: BenefitProviderFormRow
  onSuccess?: () => void
}

function formatCountryCodes(values: readonly string[]): string {
  return values.join(", ")
}

export function BenefitProviderForm({
  mode,
  provider,
  onSuccess,
}: BenefitProviderFormProps) {
  const t = useTranslations("Dashboard.Hrm.benefits.providerForm")
  const action =
    mode === "create"
      ? createBenefitProviderAction
      : updateBenefitProviderAction
  const [state, formAction, pending] = useActionState<
    BenefitPlanMutationFormState | undefined,
    FormData
  >(action, undefined)

  const codeId = useId()
  const nameId = useId()
  const countriesId = useId()
  const externalId = useId()
  const activeId = useId()

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
    <form
      action={formAction}
      className="flex max-h-[min(60vh,520px)] flex-col gap-4 overflow-y-auto pr-1"
    >
      {mode === "edit" && provider ? (
        <input type="hidden" name="providerId" value={provider.id} />
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
          maxLength={64}
          required
          readOnly={mode === "edit"}
          defaultValue={provider?.code ?? ""}
        />
        {fieldErrors?.code ? <FieldError>{fieldErrors.code}</FieldError> : null}
      </Field>

      <Field>
        <FieldLabel htmlFor={nameId}>{t("fieldName")}</FieldLabel>
        <Input
          id={nameId}
          name="name"
          maxLength={256}
          required
          defaultValue={provider?.name ?? ""}
        />
        {fieldErrors?.name ? <FieldError>{fieldErrors.name}</FieldError> : null}
      </Field>

      <Field>
        <FieldLabel htmlFor={countriesId}>{t("fieldCountryCodes")}</FieldLabel>
        <Input
          id={countriesId}
          name="countryCodes"
          maxLength={512}
          defaultValue={formatCountryCodes(provider?.countryCodes ?? [])}
        />
        <FieldDescription>{t("fieldCountryCodesHint")}</FieldDescription>
      </Field>

      <Field>
        <FieldLabel htmlFor={externalId}>
          {t("fieldExternalReference")}
        </FieldLabel>
        <Input
          id={externalId}
          name="externalReference"
          maxLength={256}
          defaultValue={provider?.externalReference ?? ""}
        />
      </Field>

      {mode === "edit" ? (
        <Field>
          <div className="flex items-center gap-2">
            <input type="hidden" name="isActive" value="false" />
            <input
              id={activeId}
              type="checkbox"
              name="isActive"
              value="true"
              defaultChecked={provider?.isActive ?? true}
              className="size-4 rounded border border-border"
            />
            <FieldLabel htmlFor={activeId}>{t("fieldIsActive")}</FieldLabel>
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
