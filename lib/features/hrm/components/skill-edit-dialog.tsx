"use client"

import { useActionState, useEffect, useId, useRef, useState } from "react"
import { useTranslations } from "next-intl"
import { Loader2 } from "lucide-react"

import { Button } from "#components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "#components/ui/dialog"
import { Field, FieldDescription, FieldLabel } from "#components/ui/field"
import { Input } from "#components/ui/input"
import { Textarea } from "#components/ui/textarea"
import { updateSkillAction } from "#features/hrm/client"
import type { ContractMutationFormState } from "#features/hrm/types"

type SkillEditFormProps = {
  orgSlug: string
  skillId: string
  code: string
  label: string
  description: string | null
  onSuccess?: () => void
}

function SkillEditForm({
  orgSlug,
  skillId,
  code,
  label,
  description,
  onSuccess,
}: SkillEditFormProps) {
  const t = useTranslations("Dashboard.Hrm.skills")
  const formId = useId()
  const [state, formAction, pending] = useActionState<
    ContractMutationFormState | undefined,
    FormData
  >(updateSkillAction, undefined)

  const onSuccessRef = useRef(onSuccess)
  useEffect(() => {
    onSuccessRef.current = onSuccess
  }, [onSuccess])

  useEffect(() => {
    if (state?.ok) {
      onSuccessRef.current?.()
    }
  }, [state])

  return (
    <form action={formAction} id={formId} className="flex flex-col gap-4">
      <input type="hidden" name="orgSlug" value={orgSlug} />
      <input type="hidden" name="skillId" value={skillId} />
      <Field>
        <FieldLabel htmlFor={`skill-code-${skillId}`}>
          {t("formCode")}
        </FieldLabel>
        <Input id={`skill-code-${skillId}`} value={code} disabled />
        <FieldDescription>{t("formCodeImmutable")}</FieldDescription>
      </Field>
      <Field>
        <FieldLabel htmlFor={`skill-label-${skillId}`}>
          {t("formLabel")}
        </FieldLabel>
        <Input
          id={`skill-label-${skillId}`}
          name="label"
          defaultValue={label}
          required
          maxLength={120}
        />
      </Field>
      <Field>
        <FieldLabel htmlFor={`skill-desc-${skillId}`}>
          {t("formDescription")}
        </FieldLabel>
        <Textarea
          id={`skill-desc-${skillId}`}
          name="description"
          defaultValue={description ?? ""}
          rows={3}
          maxLength={2000}
        />
      </Field>
      {state && !state.ok && state.errors.form ? (
        <p className="text-sm text-destructive" role="alert">
          {state.errors.form}
        </p>
      ) : null}
      <DialogFooter>
        <Button type="submit" form={formId} disabled={pending}>
          {pending ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
              {t("saving")}
            </>
          ) : (
            t("saveSkill")
          )}
        </Button>
      </DialogFooter>
    </form>
  )
}

type SkillEditDialogProps = {
  orgSlug: string
  skillId: string
  code: string
  label: string
  description: string | null
}

export function SkillEditDialog({
  orgSlug,
  skillId,
  code,
  label,
  description,
}: SkillEditDialogProps) {
  const t = useTranslations("Dashboard.Hrm.skills")
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="ghost" size="sm">
          {t("editSkill")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("editSkillDialogTitle")}</DialogTitle>
          <DialogDescription>
            {t("editSkillDialogDescription")}
          </DialogDescription>
        </DialogHeader>
        <SkillEditForm
          orgSlug={orgSlug}
          skillId={skillId}
          code={code}
          label={label}
          description={description}
          onSuccess={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  )
}
