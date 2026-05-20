"use client"

import { useActionState, useId } from "react"
import { useTranslations } from "next-intl"
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
  createOtmRateRuleAction,
  type CreateOtmRateRuleFormState,
} from "#features/hrm/client"

import type { OtmTypeChoiceRow } from "../data/otm.types.shared"

const SELECT_CLASS =
  "h-9 w-full rounded border border-border bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-50"

export function OtmCreateRateDialog({
  overtimeTypes,
}: {
  overtimeTypes: OtmTypeChoiceRow[]
}) {
  const t = useTranslations("Dashboard.Hrm.overtime")
  const typeId = useId()
  const [state, formAction, pending] = useActionState<
    CreateOtmRateRuleFormState | undefined,
    FormData
  >(createOtmRateRuleAction, undefined)

  const errors = state && !state.ok ? state.errors : null

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" size="sm" variant="outline">
          {t("createRateRule")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("createRateRuleTitle")}</DialogTitle>
          <DialogDescription>{t("createRateRuleDescription")}</DialogDescription>
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
            {errors?.overtimeTypeId ? (
              <FieldError>{errors.overtimeTypeId}</FieldError>
            ) : null}
          </Field>
          <Field>
            <FieldLabel htmlFor="multiplier">{t("fieldMultiplier")}</FieldLabel>
            <Input
              id="multiplier"
              name="multiplier"
              placeholder="1.5"
              required
              disabled={pending}
            />
            {errors?.multiplier ? <FieldError>{errors.multiplier}</FieldError> : null}
          </Field>
          <Field>
            <FieldLabel htmlFor="earningCode">{t("fieldEarningCode")}</FieldLabel>
            <Input id="earningCode" name="earningCode" disabled={pending} />
          </Field>
          {errors?.form ? (
            <span className="text-xs text-destructive">{errors.form}</span>
          ) : null}
          <Button type="submit" disabled={pending}>
            {pending ? t("createRateRuleSubmitting") : t("createRateRuleSubmit")}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
