"use client"

import { useActionState, useEffect, useId, useMemo, useRef } from "react"
import { useRouter } from "#i18n/navigation"
import { Loader2 } from "lucide-react"
import { useTranslations } from "next-intl"

import { Alert, AlertDescription, AlertTitle } from "#components2/ui/alert"
import { Button } from "#components2/ui/button"
import { Field, FieldError, FieldLabel } from "#components2/ui/field"
import { Input } from "#components2/ui/input"
import {
  requestPortalEmployeeDocumentAction,
  type PortalDocumentRequestFormState,
} from "#features/hrm/client"

type EmployeePortalDocumentRequestFormProps = {
  portalSlug: string
}

export function EmployeePortalDocumentRequestForm({
  portalSlug,
}: EmployeePortalDocumentRequestFormProps) {
  const t = useTranslations("Dashboard.Hrm.portalDocuments")
  const router = useRouter()
  const [state, formAction, pending] = useActionState<
    PortalDocumentRequestFormState | undefined,
    FormData
  >(requestPortalEmployeeDocumentAction, undefined)

  const titleId = useId()
  const notesId = useId()

  const refreshed = useRef(false)
  useEffect(() => {
    if (state?.ok && !refreshed.current) {
      refreshed.current = true
      router.refresh()
    }
  }, [state, router])

  const fieldErrors = useMemo(() => {
    if (!state || state.ok) return null
    return state.errors
  }, [state])

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="portalSlug" value={portalSlug} />

      {fieldErrors?.form ? (
        <Alert variant="destructive">
          <AlertTitle>{t("errorTitle")}</AlertTitle>
          <AlertDescription>{fieldErrors.form}</AlertDescription>
        </Alert>
      ) : null}

      {state?.ok ? (
        <Alert>
          <AlertTitle>Request sent</AlertTitle>
          <AlertDescription>{t("requestDescription")}</AlertDescription>
        </Alert>
      ) : null}

      <Field>
        <FieldLabel htmlFor={titleId}>{t("fieldTitle")}</FieldLabel>
        <Input id={titleId} name="title" required className="h-9" />
        {fieldErrors?.title ? (
          <FieldError>{fieldErrors.title}</FieldError>
        ) : null}
      </Field>

      <Field>
        <FieldLabel htmlFor={notesId}>{t("fieldNotes")}</FieldLabel>
        <Input id={notesId} name="notes" className="h-9" />
        {fieldErrors?.notes ? (
          <FieldError>{fieldErrors.notes}</FieldError>
        ) : null}
      </Field>

      <Button type="submit" disabled={pending}>
        {pending ? (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
            ÔÇª
          </>
        ) : (
          t("submitRequest")
        )}
      </Button>
    </form>
  )
}
