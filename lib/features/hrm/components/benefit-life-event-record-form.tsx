"use client"

import { useActionState, useEffect, useId, useMemo, useRef } from "react"
import { useTranslations } from "next-intl"
import { Loader2 } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "#components/ui/alert"
import { Button } from "#components/ui/button"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "#components/ui/field"
import { Input } from "#components/ui/input"
import { Textarea } from "#components/ui/textarea"

import {
  recordLifeEventAction,
  type RecordLifeEventFormState,
} from "#features/hrm/client"

import { BENEFIT_LIFE_EVENT_TYPES } from "../data/benefit-helpers.shared"
import type { LeaveEmployeeChoiceRow } from "../data/leave-request.queries.server"

const SELECT_CLASS =
  "h-9 w-full rounded border border-border bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-50"

type BenefitLifeEventRecordFormProps = {
  employees: ReadonlyArray<LeaveEmployeeChoiceRow>
  onSuccess?: () => void
}

export function BenefitLifeEventRecordForm({
  employees,
  onSuccess,
}: BenefitLifeEventRecordFormProps) {
  const t = useTranslations("Dashboard.Hrm.benefits.lifeEventForm")
  const [state, formAction, pending] = useActionState<
    RecordLifeEventFormState | undefined,
    FormData
  >(recordLifeEventAction, undefined)

  const empId = useId()
  const typeId = useId()
  const dateId = useId()
  const notesId = useId()
  const docsId = useId()

  const onSuccessRef = useRef(onSuccess)
  useEffect(() => {
    onSuccessRef.current = onSuccess
  }, [onSuccess])

  useEffect(() => {
    if (state?.ok) {
      onSuccessRef.current?.()
    }
  }, [state])

  const fieldErrors = useMemo(() => {
    if (!state || state.ok) return null
    return state.errors
  }, [state])

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {fieldErrors?.form ? (
        <Alert variant="destructive">
          <AlertTitle>{t("errorTitle")}</AlertTitle>
          <AlertDescription>{fieldErrors.form}</AlertDescription>
        </Alert>
      ) : null}

      <Field>
        <FieldLabel htmlFor={empId}>{t("fieldEmployee")}</FieldLabel>
        <select id={empId} name="employeeId" className={SELECT_CLASS} required>
          <option value="">{t("selectEmployee")}</option>
          {employees.map((e) => (
            <option key={e.id} value={e.id}>
              {e.employeeNumber} — {e.legalName}
            </option>
          ))}
        </select>
        {fieldErrors?.employeeId ? (
          <FieldError>{fieldErrors.employeeId}</FieldError>
        ) : null}
      </Field>

      <Field>
        <FieldLabel htmlFor={typeId}>{t("fieldEventType")}</FieldLabel>
        <select
          id={typeId}
          name="eventType"
          className={SELECT_CLASS}
          required
          defaultValue="other"
        >
          {BENEFIT_LIFE_EVENT_TYPES.map((k) => (
            <option key={k} value={k}>
              {t(`eventTypes.${k}`)}
            </option>
          ))}
        </select>
        {fieldErrors?.eventType ? (
          <FieldError>{fieldErrors.eventType}</FieldError>
        ) : null}
      </Field>

      <Field>
        <FieldLabel htmlFor={dateId}>{t("fieldEventDate")}</FieldLabel>
        <Input id={dateId} name="eventDate" type="date" required />
        {fieldErrors?.eventDate ? (
          <FieldError>{fieldErrors.eventDate}</FieldError>
        ) : null}
      </Field>

      <Field>
        <FieldLabel htmlFor={notesId}>{t("fieldNotes")}</FieldLabel>
        <Textarea id={notesId} name="notes" rows={3} maxLength={4000} />
        {fieldErrors?.notes ? (
          <FieldError>{fieldErrors.notes}</FieldError>
        ) : null}
      </Field>

      <Field>
        <FieldLabel htmlFor={docsId}>{t("fieldDocumentIds")}</FieldLabel>
        <FieldDescription>{t("fieldDocumentIdsHint")}</FieldDescription>
        <Textarea
          id={docsId}
          name="documentIds"
          rows={2}
          className="font-mono text-xs"
          placeholder='["uuid-1","uuid-2"]'
          defaultValue="[]"
        />
      </Field>

      <Button type="submit" disabled={pending} className="self-start">
        {pending ? (
          <>
            <Loader2
              className="size-4 animate-spin"
              data-icon="inline-start"
              aria-hidden
            />
            {t("submitting")}
          </>
        ) : (
          t("submit")
        )}
      </Button>
    </form>
  )
}
