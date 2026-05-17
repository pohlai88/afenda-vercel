"use client"

import { useActionState } from "react"
import { useTranslations } from "next-intl"

import { Button } from "#components2/ui/button"
import { Field, FieldLabel } from "#components2/ui/field"
import { Input } from "#components2/ui/input"
import { Textarea } from "#components2/ui/textarea"

import { initiateOffboardingAction } from "#features/hrm/client"
import type { ContractMutationFormState } from "../../../types"
import { HRM_OFFBOARDING_EXIT_TYPES } from "../data/offboarding-exit-type.shared"

type InitiateOffboardingFormProps = {
  orgSlug: string
  employeeId: string
}

export function InitiateOffboardingForm({
  orgSlug,
  employeeId,
}: InitiateOffboardingFormProps) {
  const t = useTranslations("Dashboard.Hrm.workforce")
  const [state, formAction, pending] = useActionState(
    initiateOffboardingAction,
    undefined as ContractMutationFormState | undefined
  )

  return (
    <form action={formAction} className="grid max-w-xl gap-3">
      <input type="hidden" name="orgSlug" value={orgSlug} />
      <input type="hidden" name="employeeId" value={employeeId} />
      <Field>
        <FieldLabel htmlFor="off-exit-type">{t("offboardingExitTypeLabel")}</FieldLabel>
        <select
          id="off-exit-type"
          name="exitType"
          required
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
        >
          {HRM_OFFBOARDING_EXIT_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </Field>
      <Field>
        <FieldLabel htmlFor="off-reason">{t("offboardingExitReasonLabel")}</FieldLabel>
        <Textarea id="off-reason" name="exitReason" required rows={2} />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="off-term">{t("offboardingTerminationDateLabel")}</FieldLabel>
          <Input id="off-term" name="terminationDate" type="date" required />
        </Field>
        <Field>
          <FieldLabel htmlFor="off-lwd">{t("offboardingLastWorkingDateLabel")}</FieldLabel>
          <Input id="off-lwd" name="lastWorkingDate" type="date" required />
        </Field>
      </div>
      <Field>
        <FieldLabel htmlFor="off-notice-days">{t("offboardingNoticeDaysLabel")}</FieldLabel>
        <Input id="off-notice-days" name="requiredNoticeDays" type="number" min={0} max={365} />
      </Field>
      <div className="flex items-center gap-2">
        <input id="off-skip" name="skipApproval" type="checkbox" value="true" className="size-4" />
        <label htmlFor="off-skip" className="text-sm">
          {t("offboardingSkipApprovalLabel")}
        </label>
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? t("offboardingInitiating") : t("offboardingInitiateSubmit")}
      </Button>
      {state && !state.ok && state.errors.form ? (
        <p className="text-sm text-destructive">{state.errors.form}</p>
      ) : null}
      {state?.ok ? (
        <p className="text-sm text-muted-foreground">{t("offboardingInitiated")}</p>
      ) : null}
    </form>
  )
}
