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
  createOtmTypeAction,
  type CreateOtmTypeFormState,
} from "#features/hrm/client"
import { HRM_OTM_DAY_CATEGORIES } from "../schemas/otm.schema"

const SELECT_CLASS =
  "h-9 w-full rounded border border-border bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-50"

export function OtmCreateTypeDialog() {
  const t = useTranslations("Dashboard.Hrm.overtime")

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          {t("createTypeOpen")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("createTypeTitle")}</DialogTitle>
          <DialogDescription>{t("createTypeDescription")}</DialogDescription>
        </DialogHeader>
        <CreateOtmTypeForm />
      </DialogContent>
    </Dialog>
  )
}

function CreateOtmTypeForm() {
  const t = useTranslations("Dashboard.Hrm.overtime")
  const [state, formAction, pending] = useActionState<
    CreateOtmTypeFormState | undefined,
    FormData
  >(createOtmTypeAction, undefined)

  const codeId = useId()
  const labelId = useId()
  const dayCategoryId = useId()
  const descriptionId = useId()

  const errors = state && !state.ok ? state.errors : null

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <Field>
        <FieldLabel htmlFor={codeId}>{t("fieldTypeCode")}</FieldLabel>
        <Input id={codeId} name="code" required disabled={pending} />
        {errors?.code ? <FieldError>{errors.code}</FieldError> : null}
      </Field>
      <Field>
        <FieldLabel htmlFor={labelId}>{t("fieldTypeLabel")}</FieldLabel>
        <Input id={labelId} name="label" required disabled={pending} />
        {errors?.label ? <FieldError>{errors.label}</FieldError> : null}
      </Field>
      <Field>
        <FieldLabel htmlFor={dayCategoryId}>{t("fieldDayCategory")}</FieldLabel>
        <select
          id={dayCategoryId}
          name="dayCategory"
          className={SELECT_CLASS}
          required
          disabled={pending}
          defaultValue="normal_day"
        >
          {HRM_OTM_DAY_CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {t(`dayCategoryLabels.${category}`)}
            </option>
          ))}
        </select>
        {errors?.dayCategory ? (
          <FieldError>{errors.dayCategory}</FieldError>
        ) : null}
      </Field>
      <Field>
        <FieldLabel htmlFor={descriptionId}>
          {t("fieldTypeDescription")}
        </FieldLabel>
        <Input id={descriptionId} name="description" disabled={pending} />
      </Field>
      {errors?.form ? (
        <span className="text-xs text-destructive">{errors.form}</span>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? (
          <>
            <Loader2
              className="size-4 animate-spin"
              data-icon="inline-start"
              aria-hidden
            />
            {t("createTypeSubmitting")}
          </>
        ) : (
          t("createTypeSubmit")
        )}
      </Button>
    </form>
  )
}
