"use client"

import { useActionState, useEffect, useId, useRef } from "react"
import { useTranslations } from "next-intl"
import { Loader2 } from "lucide-react"

import { Alert, AlertDescription } from "#components/ui/alert"
import { Button } from "#components/ui/button"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "#components/ui/field"
import { Input } from "#components/ui/input"
import {
  submitEmployeePortalRecordLifeEvent,
  type RecordLifeEventFormState,
} from "#features/hrm/client"
import { BENEFIT_LIFE_EVENT_TYPES } from "../data/benefit-helpers.shared"

type EmployeePortalBenefitLifeEventFormProps = {
  portalSlug: string
}

const SELECT_CLASS =
  "h-9 w-full rounded border border-border bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-50"

export function EmployeePortalBenefitLifeEventForm({
  portalSlug,
}: EmployeePortalBenefitLifeEventFormProps) {
  const t = useTranslations("Dashboard.Hrm.portalBenefits")
  const [state, formAction, pending] = useActionState<
    RecordLifeEventFormState | undefined,
    FormData
  >(submitEmployeePortalRecordLifeEvent, undefined)

  const eventTypeId = useId()
  const eventDateId = useId()
  const notesId = useId()
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (state?.ok) formRef.current?.reset()
  }, [state])

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="portalSlug" value={portalSlug} />

      {state && !state.ok && state.errors.form ? (
        <Alert variant="destructive">
          <AlertDescription>{state.errors.form}</AlertDescription>
        </Alert>
      ) : null}

      {state?.ok ? (
        <Alert>
          <AlertDescription>{t("lifeEventSuccess")}</AlertDescription>
        </Alert>
      ) : null}

      <Field>
        <FieldLabel htmlFor={eventTypeId}>{t("lifeEventType")}</FieldLabel>
        <select
          id={eventTypeId}
          name="eventType"
          required
          disabled={pending}
          className={SELECT_CLASS}
          defaultValue={BENEFIT_LIFE_EVENT_TYPES[0]}
        >
          {BENEFIT_LIFE_EVENT_TYPES.map((type) => (
            <option key={type} value={type}>
              {t(`lifeEventTypes.${type}`)}
            </option>
          ))}
        </select>
        {state && !state.ok && state.errors.eventType ? (
          <FieldError>{state.errors.eventType}</FieldError>
        ) : null}
      </Field>

      <Field>
        <FieldLabel htmlFor={eventDateId}>{t("lifeEventDate")}</FieldLabel>
        <Input
          id={eventDateId}
          name="eventDate"
          type="date"
          required
          disabled={pending}
        />
        {state && !state.ok && state.errors.eventDate ? (
          <FieldError>{state.errors.eventDate}</FieldError>
        ) : null}
      </Field>

      <Field>
        <FieldLabel htmlFor={notesId}>{t("lifeEventNotes")}</FieldLabel>
        <Input
          id={notesId}
          name="notes"
          type="text"
          disabled={pending}
          maxLength={4000}
        />
        <FieldDescription>{t("lifeEventNotesHelp")}</FieldDescription>
      </Field>

      <Button type="submit" disabled={pending}>
        {pending ? (
          <>
            <Loader2 className="size-4 animate-spin" aria-hidden />
            {t("lifeEventSubmitting")}
          </>
        ) : (
          t("lifeEventSubmit")
        )}
      </Button>
    </form>
  )
}
