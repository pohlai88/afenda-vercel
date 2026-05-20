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

import { createFwaEligibilityRuleAction } from "../actions/fwa-eligibility.actions"
import type { CreateFwaEligibilityRuleFormState } from "../../../types"

import type { FwaArrangementTypeChoiceRow } from "../data/fwa.types.shared"

const SELECT_CLASS =
  "h-9 w-full rounded border border-border bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-50"

type FwaEligibilityCreateDialogProps = {
  arrangementTypes: FwaArrangementTypeChoiceRow[]
}

export function FwaEligibilityCreateDialog({
  arrangementTypes,
}: FwaEligibilityCreateDialogProps) {
  const t = useTranslations("Dashboard.Hrm.flexibleWork")
  const typeId = useId()
  const [state, formAction, pending] = useActionState<
    CreateFwaEligibilityRuleFormState | undefined,
    FormData
  >(createFwaEligibilityRuleAction, undefined)

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
            <FieldLabel htmlFor={typeId}>
              {t("fieldArrangementType")}
            </FieldLabel>
            <select
              id={typeId}
              name="arrangementTypeId"
              className={SELECT_CLASS}
              required
              disabled={pending}
            >
              <option value="">{t("fieldArrangementTypePlaceholder")}</option>
              {arrangementTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.label}
                </option>
              ))}
            </select>
            {error?.arrangementTypeId ? (
              <FieldError>{error.arrangementTypeId}</FieldError>
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
            <FieldLabel htmlFor="legalEntityCode">
              {t("fieldLegalEntityCode")}
            </FieldLabel>
            <Input
              id="legalEntityCode"
              name="legalEntityCode"
              disabled={pending}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="countryCode">
              {t("fieldCountryCode")}
            </FieldLabel>
            <Input
              id="countryCode"
              name="countryCode"
              placeholder={t("fieldCountryCodePlaceholder")}
              disabled={pending}
            />
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
            <FieldLabel htmlFor="positionId">{t("fieldPositionId")}</FieldLabel>
            <Input id="positionId" name="positionId" disabled={pending} />
          </Field>
          <Field>
            <FieldLabel htmlFor="workerCategory">
              {t("fieldWorkerCategory")}
            </FieldLabel>
            <Input
              id="workerCategory"
              name="workerCategory"
              disabled={pending}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="policyGroupCode">
              {t("fieldPolicyGroupCode")}
            </FieldLabel>
            <Input
              id="policyGroupCode"
              name="policyGroupCode"
              disabled={pending}
            />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="allowException" disabled={pending} />
            {t("fieldAllowException")}
          </label>
          {error?.form ? <FieldError>{error.form}</FieldError> : null}
          <Button type="submit" disabled={pending}>
            {pending ? (
              <>
                <Loader2
                  className="size-4 animate-spin"
                  data-icon="inline-start"
                  aria-hidden
                />
                {t("creatingEligibilityRule")}
              </>
            ) : (
              t("confirmCreateEligibilityRule")
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
