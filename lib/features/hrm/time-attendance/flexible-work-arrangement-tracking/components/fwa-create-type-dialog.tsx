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
  createFwaArrangementTypeAction,
  type CreateFwaTypeFormState,
} from "#features/hrm/client"
import { HRM_FWA_ARRANGEMENT_KINDS } from "../schemas/fwa-workflow-state.shared"

const SELECT_CLASS =
  "h-9 w-full rounded border border-border bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-50"

export function FwaCreateTypeDialog() {
  const t = useTranslations("Dashboard.Hrm.flexibleWork")

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
        <CreateFwaTypeForm />
      </DialogContent>
    </Dialog>
  )
}

function CreateFwaTypeForm() {
  const t = useTranslations("Dashboard.Hrm.flexibleWork")
  const [state, formAction, pending] = useActionState<
    CreateFwaTypeFormState | undefined,
    FormData
  >(createFwaArrangementTypeAction, undefined)

  const codeId = useId()
  const labelId = useId()
  const kindId = useId()
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
        <FieldLabel htmlFor={kindId}>{t("fieldTypeKind")}</FieldLabel>
        <select
          id={kindId}
          name="arrangementKind"
          className={SELECT_CLASS}
          required
          disabled={pending}
          defaultValue="hybrid"
        >
          {HRM_FWA_ARRANGEMENT_KINDS.map((kind) => (
            <option key={kind} value={kind}>
              {kind}
            </option>
          ))}
        </select>
        {errors?.arrangementKind ? (
          <FieldError>{errors.arrangementKind}</FieldError>
        ) : null}
      </Field>
      <Field>
        <FieldLabel htmlFor={descriptionId}>
          {t("fieldTypeDescription")}
        </FieldLabel>
        <Input id={descriptionId} name="description" disabled={pending} />
      </Field>
      <Field orientation="horizontal">
        <input
          id="requiresRemoteLocation"
          name="requiresRemoteLocation"
          type="checkbox"
          disabled={pending}
        />
        <FieldLabel htmlFor="requiresRemoteLocation">
          {t("fieldTypeRemoteRequired")}
        </FieldLabel>
      </Field>
      <Field orientation="horizontal">
        <input
          id="requiresSupportingDocument"
          name="requiresSupportingDocument"
          type="checkbox"
          disabled={pending}
        />
        <FieldLabel htmlFor="requiresSupportingDocument">
          {t("fieldTypeEvidenceRequired")}
        </FieldLabel>
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
