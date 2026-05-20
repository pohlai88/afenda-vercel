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
  createCompensationBudgetPoolAction,
  type CreateCompensationBudgetPoolFormState,
} from "#features/hrm/client"
import { HRM_COMPENSATION_BUDGET_SCOPE_TYPES } from "../schemas/compensation-planning.shared"

const SELECT_CLASS =
  "h-9 w-full rounded border border-border bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-50"

export function CpmCreateBudgetPoolDialog({ cycleId }: { cycleId: string }) {
  const t = useTranslations("Dashboard.Hrm.compensationPlanning")

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          {t("createBudgetPoolOpen")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("createBudgetPoolTitle")}</DialogTitle>
          <DialogDescription>
            {t("createBudgetPoolDescription")}
          </DialogDescription>
        </DialogHeader>
        <CreateCompensationBudgetPoolForm cycleId={cycleId} />
      </DialogContent>
    </Dialog>
  )
}

function CreateCompensationBudgetPoolForm({ cycleId }: { cycleId: string }) {
  const t = useTranslations("Dashboard.Hrm.compensationPlanning")
  const [state, formAction, pending] = useActionState<
    CreateCompensationBudgetPoolFormState | undefined,
    FormData
  >(createCompensationBudgetPoolAction, undefined)

  const scopeTypeId = useId()
  const scopeIdField = useId()
  const amountId = useId()

  const errors = state && state.ok === false ? state.errors : null

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="cycleId" value={cycleId} />
      <input type="hidden" name="currency" value="MYR" />
      <Field>
        <FieldLabel htmlFor={scopeTypeId}>{t("fieldScopeType")}</FieldLabel>
        <select
          id={scopeTypeId}
          name="scopeType"
          className={SELECT_CLASS}
          required
          disabled={pending}
          defaultValue="department"
        >
          {HRM_COMPENSATION_BUDGET_SCOPE_TYPES.map((scopeType) => (
            <option key={scopeType} value={scopeType}>
              {t(`scopeType.${scopeType}`)}
            </option>
          ))}
        </select>
        {errors?.scopeType ? <FieldError>{errors.scopeType}</FieldError> : null}
      </Field>
      <Field>
        <FieldLabel htmlFor={scopeIdField}>{t("fieldScopeId")}</FieldLabel>
        <Input id={scopeIdField} name="scopeId" required disabled={pending} />
        {errors?.scopeId ? <FieldError>{errors.scopeId}</FieldError> : null}
      </Field>
      <Field>
        <FieldLabel htmlFor={amountId}>{t("fieldAllocatedAmount")}</FieldLabel>
        <Input
          id={amountId}
          name="allocatedAmount"
          type="number"
          min={0}
          step="0.01"
          required
          disabled={pending}
        />
        {errors?.allocatedAmount ? (
          <FieldError>{errors.allocatedAmount}</FieldError>
        ) : null}
      </Field>
      {errors?.form ? <FieldError>{errors.form}</FieldError> : null}
      <Button type="submit" disabled={pending}>
        {pending ? (
          <>
            <Loader2 className="size-4 animate-spin" aria-hidden />
            {t("createBudgetPoolSubmitting")}
          </>
        ) : (
          t("createBudgetPoolSubmit")
        )}
      </Button>
    </form>
  )
}
