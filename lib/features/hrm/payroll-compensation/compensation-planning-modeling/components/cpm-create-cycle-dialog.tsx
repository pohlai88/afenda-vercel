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
  createCompensationCycleAction,
  type CreateCompensationCycleFormState,
} from "#features/hrm/client"
import { HRM_COMPENSATION_CYCLE_TYPES } from "../schemas/compensation-planning.shared"

const SELECT_CLASS =
  "h-9 w-full rounded border border-border bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-50"

export function CpmCreateCycleDialog() {
  const t = useTranslations("Dashboard.Hrm.compensationPlanning")

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          {t("createCycleOpen")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("createCycleTitle")}</DialogTitle>
          <DialogDescription>{t("createCycleDescription")}</DialogDescription>
        </DialogHeader>
        <CreateCompensationCycleForm />
      </DialogContent>
    </Dialog>
  )
}

function CreateCompensationCycleForm() {
  const t = useTranslations("Dashboard.Hrm.compensationPlanning")
  const [state, formAction, pending] = useActionState<
    CreateCompensationCycleFormState | undefined,
    FormData
  >(createCompensationCycleAction, undefined)

  const codeId = useId()
  const nameId = useId()
  const typeId = useId()
  const effectiveId = useId()

  const errors = state && state.ok === false ? state.errors : null

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <Field>
        <FieldLabel htmlFor={codeId}>{t("fieldCycleCode")}</FieldLabel>
        <Input id={codeId} name="code" required disabled={pending} />
        {errors?.code ? <FieldError>{errors.code}</FieldError> : null}
      </Field>
      <Field>
        <FieldLabel htmlFor={nameId}>{t("fieldCycleName")}</FieldLabel>
        <Input id={nameId} name="name" required disabled={pending} />
        {errors?.name ? <FieldError>{errors.name}</FieldError> : null}
      </Field>
      <Field>
        <FieldLabel htmlFor={typeId}>{t("fieldCycleType")}</FieldLabel>
        <select
          id={typeId}
          name="cycleType"
          className={SELECT_CLASS}
          required
          disabled={pending}
          defaultValue="annual_review"
        >
          {HRM_COMPENSATION_CYCLE_TYPES.map((cycleType) => (
            <option key={cycleType} value={cycleType}>
              {t(`cycleType.${cycleType}`)}
            </option>
          ))}
        </select>
        {errors?.cycleType ? (
          <FieldError>{errors.cycleType}</FieldError>
        ) : null}
      </Field>
      <Field>
        <FieldLabel htmlFor={effectiveId}>{t("fieldEffectiveDate")}</FieldLabel>
        <Input
          id={effectiveId}
          name="effectiveDate"
          type="date"
          required
          disabled={pending}
        />
        {errors?.effectiveDate ? (
          <FieldError>{errors.effectiveDate}</FieldError>
        ) : null}
      </Field>
      {errors?.form ? <FieldError>{errors.form}</FieldError> : null}
      <Button type="submit" disabled={pending}>
        {pending ? (
          <>
            <Loader2 className="size-4 animate-spin" aria-hidden />
            {t("createCycleSubmitting")}
          </>
        ) : (
          t("createCycleSubmit")
        )}
      </Button>
    </form>
  )
}
