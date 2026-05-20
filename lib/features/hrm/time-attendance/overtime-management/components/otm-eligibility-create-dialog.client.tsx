"use client"

import { useActionState, useId } from "react"
import { useTranslations } from "next-intl"
import { Loader2 } from "lucide-react"

import { Button } from "#components2/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "#components2/ui/dialog"
import { Field, FieldError, FieldLabel } from "#components2/ui/field"
import { Input } from "#components2/ui/input"

import {
  createOtmEligibilityRuleAction,
  type CreateOtmEligibilityRuleFormState,
} from "#features/hrm/client"

import type { OtmTypeChoiceRow } from "../data/otm.types.shared"

const SELECT_CLASS =
  "h-9 w-full rounded border border-border bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-50"

type OtmEligibilityCreateDialogProps = {
  overtimeTypes: OtmTypeChoiceRow[]
}

export function OtmEligibilityCreateDialog({
  overtimeTypes,
}: OtmEligibilityCreateDialogProps) {
  const t = useTranslations("Dashboard.Hrm.overtime")
  const typeId = useId()
  const [state, formAction, pending] = useActionState<
    CreateOtmEligibilityRuleFormState | undefined,
    FormData
  >(createOtmEligibilityRuleAction, undefined)

  const error = state && !state.ok ? state.errors : null

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" size="sm" variant="outline">
          {t("createEligibilityRule")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("createEligibilityRuleTitle")}</DialogTitle>
          <DialogDescription>
            {t("createEligibilityRuleDescription")}
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <Field>
            <FieldLabel htmlFor={typeId}>{t("fieldOvertimeType")}</FieldLabel>
            <select
              id={typeId}
              name="overtimeTypeId"
              className={SELECT_CLASS}
              required
              disabled={pending}
            >
              <option value="">{t("fieldOvertimeTypePlaceholder")}</option>
              {overtimeTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.label}
                </option>
              ))}
            </select>
            {error?.overtimeTypeId ? (
              <FieldError>{error.overtimeTypeId}</FieldError>
            ) : null}
          </Field>
          <Field>
            <FieldLabel htmlFor="departmentId">
              {t("fieldDepartmentId")}
            </FieldLabel>
            <Input id="departmentId" name="departmentId" disabled={pending} />
          </Field>
          <Field>
            <FieldLabel htmlFor="jobGradeId">{t("fieldJobGradeId")}</FieldLabel>
            <Input id="jobGradeId" name="jobGradeId" disabled={pending} />
          </Field>
          <Field>
            <FieldLabel htmlFor="employmentType">
              {t("fieldEmploymentType")}
            </FieldLabel>
            <Input
              id="employmentType"
              name="employmentType"
              disabled={pending}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="countryCode">{t("fieldCountryCode")}</FieldLabel>
            <Input id="countryCode" name="countryCode" disabled={pending} />
          </Field>
          <Field>
            <FieldLabel htmlFor="workLocationCode">
              {t("fieldWorkLocationCode")}
            </FieldLabel>
            <Input
              id="workLocationCode"
              name="workLocationCode"
              disabled={pending}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="legalEntityCode">
              {t("fieldLegalEntityCode")}
            </FieldLabel>
            <Input
              id="legalEntityCode"
              name="legalEntityCode"
              disabled={pending}
            />
          </Field>
          <Field orientation="horizontal">
            <input
              id="allowException"
              name="allowException"
              type="checkbox"
              disabled={pending}
            />
            <FieldLabel htmlFor="allowException">
              {t("fieldAllowException")}
            </FieldLabel>
          </Field>
          {error?.form ? (
            <span className="text-xs text-destructive">{error.form}</span>
          ) : null}
          <Button type="submit" disabled={pending}>
            {pending ? (
              <>
                <Loader2
                  className="size-4 animate-spin"
                  data-icon="inline-start"
                  aria-hidden
                />
                {t("createEligibilitySubmitting")}
              </>
            ) : (
              t("createEligibilitySubmit")
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
