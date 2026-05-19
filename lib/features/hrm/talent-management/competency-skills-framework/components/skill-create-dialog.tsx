"use client"

import { useActionState, useId, useState } from "react"
import { useTranslations } from "next-intl"
import { Loader2, PlusIcon } from "lucide-react"

import { Alert, AlertDescription } from "#components2/ui/alert"
import { Button } from "#components2/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "#components2/ui/dialog"
import { Field, FieldDescription, FieldLabel } from "#components2/ui/field"
import { Input } from "#components2/ui/input"
import { createSkillAction } from "#features/hrm/client"
import type { ContractMutationFormState } from "#features/hrm/types"

import { useFormSuccess } from "../../../_internal-cross-cutting/use-form-success.client"

type SkillCreateFormProps = {
  orgSlug: string
  onSuccess?: () => void
}

/**
 * Form body extracted from the dialog wrapper so the cross-boundary
 * `onSuccess` callback runs as a normal function in a ref-stable effect,
 * not as a direct `setState` call inside an effect body ÔÇö same pattern
 * as `LeaveApplyForm`.
 */
function SkillCreateForm({ orgSlug, onSuccess }: SkillCreateFormProps) {
  const t = useTranslations("Dashboard.Hrm.skills")
  const formId = useId()
  const [state, formAction, pending] = useActionState<
    ContractMutationFormState | undefined,
    FormData
  >(createSkillAction, undefined)
  useFormSuccess(state, onSuccess)

  return (
    <form action={formAction} id={formId} className="flex flex-col gap-4">
      <input type="hidden" name="orgSlug" value={orgSlug} />

      {state && !state.ok && state.errors.form ? (
        <Alert variant="destructive">
          <AlertDescription>{state.errors.form}</AlertDescription>
        </Alert>
      ) : null}

      <Field>
        <FieldLabel htmlFor={`${formId}-code`}>{t("formCode")}</FieldLabel>
        <Input
          id={`${formId}-code`}
          name="code"
          required
          disabled={pending}
          placeholder="typescript"
          autoComplete="off"
        />
        <FieldDescription>{t("formCodeHelp")}</FieldDescription>
      </Field>

      <Field>
        <FieldLabel htmlFor={`${formId}-label`}>{t("formLabel")}</FieldLabel>
        <Input
          id={`${formId}-label`}
          name="label"
          required
          disabled={pending}
          maxLength={120}
        />
      </Field>

      <Field>
        <FieldLabel htmlFor={`${formId}-description`}>
          {t("formDescription")}
        </FieldLabel>
        <Input
          id={`${formId}-description`}
          name="description"
          disabled={pending}
          maxLength={2000}
        />
      </Field>

      <Button type="submit" disabled={pending}>
        {pending ? (
          <>
            <Loader2 className="size-4 animate-spin" aria-hidden />
            {t("formSubmitting")}
          </>
        ) : (
          t("formSubmit")
        )}
      </Button>
    </form>
  )
}

type SkillCreateDialogProps = {
  orgSlug: string
}

export function SkillCreateDialog({ orgSlug }: SkillCreateDialogProps) {
  const t = useTranslations("Dashboard.Hrm.skills")
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" type="button">
          <PlusIcon data-icon="inline-start" aria-hidden />
          {t("createSkill")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("createSkillDialogTitle")}</DialogTitle>
          <DialogDescription>
            {t("createSkillDialogDescription")}
          </DialogDescription>
        </DialogHeader>
        <SkillCreateForm orgSlug={orgSlug} onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  )
}
