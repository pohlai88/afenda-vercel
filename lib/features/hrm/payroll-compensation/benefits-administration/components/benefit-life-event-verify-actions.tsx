"use client"

import { useActionState, useEffect, useId, useRef } from "react"
import { useTranslations } from "next-intl"
import { Loader2 } from "lucide-react"

import { Alert, AlertDescription } from "#components/ui/alert"
import { Button } from "#components/ui/button"
import { Field, FieldLabel } from "#components/ui/field"
import { Input } from "#components/ui/input"
import { useRouter } from "#i18n/navigation"

import { verifyLifeEventAction } from "../actions/benefit-life-event.actions"

type BenefitLifeEventVerifyActionsProps = {
  lifeEventId: string
}

export function BenefitLifeEventVerifyActions({
  lifeEventId,
}: BenefitLifeEventVerifyActionsProps) {
  const t = useTranslations("Dashboard.Hrm.benefits.lifeEventsTable")
  const noteId = useId()
  const [state, formAction, pending] = useActionState(
    verifyLifeEventAction,
    undefined
  )
  const router = useRouter()
  const did = useRef(false)
  useEffect(() => {
    if (state?.ok && !did.current) {
      did.current = true
      router.refresh()
    }
  }, [state, router])

  const err = state && !state.ok ? state.errors.form : null

  return (
    <form
      action={formAction}
      className="flex w-full max-w-xs flex-col items-end gap-2"
    >
      <input type="hidden" name="lifeEventId" value={lifeEventId} />
      {err ? (
        <Alert variant="destructive" className="py-2">
          <AlertDescription className="text-xs">{err}</AlertDescription>
        </Alert>
      ) : null}
      <Field className="w-full">
        <FieldLabel htmlFor={noteId} className="text-xs">
          {t("verificationNoteOptional")}
        </FieldLabel>
        <Input id={noteId} name="verificationNote" maxLength={2000} />
      </Field>
      <div className="flex flex-wrap justify-end gap-2">
        <Button
          size="sm"
          type="submit"
          name="verificationStatus"
          value="verified"
          disabled={pending}
        >
          {pending ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            t("verify")
          )}
        </Button>
        <Button
          size="sm"
          type="submit"
          name="verificationStatus"
          value="rejected"
          variant="destructive"
          disabled={pending}
        >
          {t("reject")}
        </Button>
      </div>
    </form>
  )
}
