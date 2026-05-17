"use client"

import { useActionState } from "react"
import { useTranslations } from "next-intl"
import { Loader2 } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "#components2/ui/alert"
import { Button } from "#components2/ui/button"
import { Field, FieldError, FieldLabel } from "#components2/ui/field"
import { Input } from "#components2/ui/input"

import { createDraftContractAction } from "#features/hrm/client"

import {
  HRM_CONTRACT_TYPES,
  HRM_PAY_FREQUENCIES,
} from "../schemas/employment-contract.schema"

type EmploymentContractDraftFormProps = {
  orgSlug: string
  employeeId: string
}

export function EmploymentContractDraftForm({
  orgSlug,
  employeeId,
}: EmploymentContractDraftFormProps) {
  const t = useTranslations("Dashboard.Hrm.workforce")
  const tContractTypes = useTranslations(
    "Dashboard.Hrm.workforce.contractTypes"
  )
  const tPayFrequencies = useTranslations(
    "Dashboard.Hrm.workforce.payFrequencies"
  )
  const [state, formAction, pending] = useActionState(
    createDraftContractAction,
    undefined
  )

  return (
    <div className="rounded-lg border border-border bg-muted/20 p-4">
      <p className="text-sm font-medium">{t("contractDraftTitle")}</p>
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
          <Field>
            <FieldLabel htmlFor="draft-contract-type">
              {t("contractTypeLabel")}
            </FieldLabel>
            <select
              id="draft-contract-type"
              name="contractType"
              required
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
              defaultValue={HRM_CONTRACT_TYPES[0]}
            >
              {HRM_CONTRACT_TYPES.map((ct) => (
                <option key={ct} value={ct}>
                  {tContractTypes(ct)}
                </option>
              ))}
            </select>
          </Field>
          <Field
            data-invalid={state && !state.ok && state.errors.effectiveFrom}
          >
            <FieldLabel htmlFor="draft-effective-from">
              {t("contractEffectiveFrom")}
            </FieldLabel>
            <Input
              id="draft-effective-from"
              name="effectiveFrom"
              type="date"
              required
              aria-invalid={Boolean(
                state && !state.ok && state.errors.effectiveFrom
              )}
            />
            {state && !state.ok && state.errors.effectiveFrom ? (
              <FieldError>{state.errors.effectiveFrom}</FieldError>
            ) : null}
          </Field>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <Field>
            <FieldLabel htmlFor="draft-dept">
              {t("fieldDepartmentId")}
            </FieldLabel>
            <Input id="draft-dept" name="departmentId" placeholder="UUID" />
          </Field>
          <Field>
            <FieldLabel htmlFor="draft-pos">{t("fieldPositionId")}</FieldLabel>
            <Input id="draft-pos" name="positionId" placeholder="UUID" />
          </Field>
          <Field>
            <FieldLabel htmlFor="draft-grade">
              {t("fieldJobGradeId")}
            </FieldLabel>
            <Input id="draft-grade" name="jobGradeId" placeholder="UUID" />
          </Field>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <Field>
            <FieldLabel htmlFor="draft-salary">
              {t("contractBaseSalary")}
            </FieldLabel>
            <Input
              id="draft-salary"
              name="baseSalaryAmount"
              placeholder="0.00"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="draft-pay-freq">
              {t("contractPayFrequency")}
            </FieldLabel>
            <select
              id="draft-pay-freq"
              name="payFrequency"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
              defaultValue={HRM_PAY_FREQUENCIES[0]}
            >
              {HRM_PAY_FREQUENCIES.map((pf) => (
                <option key={pf} value={pf}>
                  {tPayFrequencies(pf)}
                </option>
              ))}
            </select>
          </Field>
          <Field>
            <FieldLabel htmlFor="draft-hours">
              {t("contractWeeklyHours")}
            </FieldLabel>
            <Input
              id="draft-hours"
              name="normalWorkingHoursPerWeek"
              placeholder="40"
            />
          </Field>
        </div>

        <Button type="submit" disabled={pending}>
          {pending ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
              {t("contractCreatingDraft")}
            </>
          ) : (
            t("contractCreateDraft")
          )}
        </Button>
      </form>
    </div>
  )
}
