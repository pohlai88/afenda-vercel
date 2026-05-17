"use client"

import { useActionState } from "react"
import { useTranslations } from "next-intl"

import { Alert, AlertDescription } from "#components2/ui/alert"
import { Button } from "#components2/ui/button"
import { Field, FieldError, FieldLabel } from "#components2/ui/field"
import { Input } from "#components2/ui/input"
import { updatePortalEmergencyContactAction } from "#features/hrm/client"
import type { EmployeeMasterMutationFormState } from "#features/hrm/types"

type EmployeePortalProfileEmergencyFormProps = {
  portalSlug: string
  defaults: {
    personalEmail: string
    personalPhone: string
    addressLine1: string
    addressLine2: string
    city: string
    region: string
    postalCode: string
    countryCode: string
  }
}

export function EmployeePortalProfileEmergencyForm({
  portalSlug,
  defaults,
}: EmployeePortalProfileEmergencyFormProps) {
  const t = useTranslations("Dashboard.Hrm.portalProfile")
  const [state, formAction, pending] = useActionState<
    EmployeeMasterMutationFormState | undefined,
    FormData
  >(updatePortalEmergencyContactAction, undefined)

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
        <FieldLabel htmlFor="personalEmail">{t("personalEmail")}</FieldLabel>
        <Input
          id="personalEmail"
          name="personalEmail"
          type="email"
          defaultValue={defaults.personalEmail}
        />
      </Field>

      <Field>
        <FieldLabel htmlFor="personalPhone">{t("personalPhone")}</FieldLabel>
        <Input
          id="personalPhone"
          name="personalPhone"
          defaultValue={defaults.personalPhone}
        />
      </Field>

      <Field>
        <FieldLabel htmlFor="addressLine1">{t("addressLine1")}</FieldLabel>
        <Input
          id="addressLine1"
          name="addressLine1"
          defaultValue={defaults.addressLine1}
        />
      </Field>

      <Field>
        <FieldLabel htmlFor="addressLine2">{t("addressLine2")}</FieldLabel>
        <Input
          id="addressLine2"
          name="addressLine2"
          defaultValue={defaults.addressLine2}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="city">{t("city")}</FieldLabel>
          <Input id="city" name="city" defaultValue={defaults.city} />
        </Field>
        <Field>
          <FieldLabel htmlFor="region">{t("region")}</FieldLabel>
          <Input id="region" name="region" defaultValue={defaults.region} />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="postalCode">{t("postalCode")}</FieldLabel>
          <Input
            id="postalCode"
            name="postalCode"
            defaultValue={defaults.postalCode}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="countryCode">{t("countryCode")}</FieldLabel>
          <Input
            id="countryCode"
            name="countryCode"
            defaultValue={defaults.countryCode}
          />
        </Field>
      </div>

      {state && !state.ok && state.errors.form ? (
        <FieldError>{state.errors.form}</FieldError>
      ) : null}

      <Button type="submit" className="min-h-11 w-fit" disabled={pending}>
        {pending ? t("saving") : t("save")}
      </Button>
    </form>
  )
}
