"use client"

import { useActionState } from "react"
import { useTranslations } from "next-intl"

import { Alert, AlertDescription } from "#components/ui/alert"
import { Button } from "#components/ui/button"
import { Field, FieldError, FieldLabel } from "#components/ui/field"
import { Input } from "#components/ui/input"
import { updatePortalPersonalProfileAction } from "#features/hrm/client"
import type { EmployeeMasterMutationFormState } from "#features/hrm/types"

type EmployeePortalProfilePersonalFormProps = {
  portalSlug: string
  defaults: {
    preferredName: string
    dateOfBirth: string
    gender: string
    nationality: string
    maritalStatus: string
  }
}

export function EmployeePortalProfilePersonalForm({
  portalSlug,
  defaults,
}: EmployeePortalProfilePersonalFormProps) {
  const t = useTranslations("Dashboard.Hrm.portalProfile")
  const [state, formAction, pending] = useActionState<
    EmployeeMasterMutationFormState | undefined,
    FormData
  >(updatePortalPersonalProfileAction, undefined)

  return (
    <form action={formAction} className="flex max-w-lg flex-col gap-4">
      <input type="hidden" name="portalSlug" value={portalSlug} />

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
        <FieldLabel htmlFor="preferredName">{t("preferredName")}</FieldLabel>
        <Input
          id="preferredName"
          name="preferredName"
          defaultValue={defaults.preferredName}
        />
      </Field>

      <Field>
        <FieldLabel htmlFor="dateOfBirth">{t("dateOfBirth")}</FieldLabel>
        <Input
          id="dateOfBirth"
          name="dateOfBirth"
          type="date"
          defaultValue={defaults.dateOfBirth}
        />
      </Field>

      <Field>
        <FieldLabel htmlFor="gender">{t("gender")}</FieldLabel>
        <Input id="gender" name="gender" defaultValue={defaults.gender} />
      </Field>

      <Field>
        <FieldLabel htmlFor="nationality">{t("nationality")}</FieldLabel>
        <Input
          id="nationality"
          name="nationality"
          defaultValue={defaults.nationality}
        />
      </Field>

      <Field>
        <FieldLabel htmlFor="maritalStatus">{t("maritalStatus")}</FieldLabel>
        <Input
          id="maritalStatus"
          name="maritalStatus"
          defaultValue={defaults.maritalStatus}
        />
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
