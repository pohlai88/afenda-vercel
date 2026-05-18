"use client"

import { useActionState } from "react"
import { useTranslations } from "next-intl"

import { Button } from "#components2/ui/button"
import { Checkbox } from "#components2/ui/checkbox"
import {
  Field,
  FieldContent,
  FieldGroup,
  FieldLabel,
} from "#components2/ui/field"
import { Input } from "#components2/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "#components2/ui/select"
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
    <form action={formAction} className="max-w-xl">
      <input type="hidden" name="orgSlug" value={orgSlug} />
      <input type="hidden" name="employeeId" value={employeeId} />
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="off-exit-type">
            {t("offboardingExitTypeLabel")}
          </FieldLabel>
          <Select
            name="exitType"
            required
            defaultValue={HRM_OFFBOARDING_EXIT_TYPES[0]}
          >
            <SelectTrigger id="off-exit-type" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {HRM_OFFBOARDING_EXIT_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field>
          <FieldLabel htmlFor="off-reason">
            {t("offboardingExitReasonLabel")}
          </FieldLabel>
          <Textarea id="off-reason" name="exitReason" required rows={2} />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="off-term">
              {t("offboardingTerminationDateLabel")}
            </FieldLabel>
            <Input id="off-term" name="terminationDate" type="date" required />
          </Field>
          <Field>
            <FieldLabel htmlFor="off-lwd">
              {t("offboardingLastWorkingDateLabel")}
            </FieldLabel>
            <Input id="off-lwd" name="lastWorkingDate" type="date" required />
          </Field>
          <Field>
            <FieldLabel htmlFor="off-effective-separation">
              {t("offboardingEffectiveSeparationDateLabel")}
            </FieldLabel>
            <Input
              id="off-effective-separation"
              name="effectiveSeparationDate"
              type="date"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="off-notice-days">
              {t("offboardingNoticeDaysLabel")}
            </FieldLabel>
            <Input
              id="off-notice-days"
              name="requiredNoticeDays"
              type="number"
              min={0}
              max={365}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="off-notice-start">
              {t("offboardingNoticeStartDateLabel")}
            </FieldLabel>
            <Input id="off-notice-start" name="noticeStartDate" type="date" />
          </Field>
          <Field>
            <FieldLabel htmlFor="off-notice-end">
              {t("offboardingNoticeEndDateLabel")}
            </FieldLabel>
            <Input id="off-notice-end" name="noticeEndDate" type="date" />
          </Field>
        </div>
        <Field orientation="horizontal">
          <Checkbox id="off-notice-waived" name="noticeWaived" value="true" />
          <FieldContent>
            <FieldLabel htmlFor="off-notice-waived">
              {t("offboardingNoticeWaivedLabel")}
            </FieldLabel>
          </FieldContent>
        </Field>
        <Field orientation="horizontal">
          <Checkbox id="off-short-notice" name="shortNotice" value="true" />
          <FieldContent>
            <FieldLabel htmlFor="off-short-notice">
              {t("offboardingShortNoticeLabel")}
            </FieldLabel>
          </FieldContent>
        </Field>
        <Field orientation="horizontal">
          <Checkbox id="off-skip" name="skipApproval" value="true" />
          <FieldContent>
            <FieldLabel htmlFor="off-skip">
              {t("offboardingSkipApprovalLabel")}
            </FieldLabel>
          </FieldContent>
        </Field>
        <Button type="submit" disabled={pending}>
          {pending
            ? t("offboardingInitiating")
            : t("offboardingInitiateSubmit")}
        </Button>
        {state && !state.ok && state.errors.form ? (
          <p className="text-sm text-destructive">{state.errors.form}</p>
        ) : null}
        {state?.ok ? (
          <p className="text-sm text-muted-foreground">
            {t("offboardingInitiated")}
          </p>
        ) : null}
      </FieldGroup>
    </form>
  )
}
