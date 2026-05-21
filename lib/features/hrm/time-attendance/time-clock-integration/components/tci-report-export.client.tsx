"use client"

import { useActionState, useId } from "react"
import { useTranslations } from "next-intl"
import { Loader2 } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "#components2/ui/alert"
import { Button } from "#components2/ui/button"
import { Field, FieldLabel } from "#components2/ui/field"
import { Input } from "#components2/ui/input"

import { exportTimeClockReportAction } from "../actions/tci-report.actions"
import type { TimeClockReportExportFormState } from "../../../types"

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

function isoDaysAgo(days: number): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - days)
  return d.toISOString().slice(0, 10)
}

export function TimeClockReportExportForm({ orgSlug }: { orgSlug: string }) {
  const t = useTranslations("Dashboard.Hrm.timeClock.report")
  const [state, formAction, pending] = useActionState<
    TimeClockReportExportFormState | undefined,
    FormData
  >(async (prev, formData) => {
    const next = await exportTimeClockReportAction(prev, formData)
    if (next?.ok) {
      const blob = new Blob([next.csv], { type: "text/csv;charset=utf-8" })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement("a")
      anchor.href = url
      anchor.download = next.filename
      document.body.appendChild(anchor)
      anchor.click()
      document.body.removeChild(anchor)
      URL.revokeObjectURL(url)
    }
    return next
  }, undefined)

  const startId = useId()
  const endId = useId()
  const employeeId = useId()
  const deviceId = useId()

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="orgSlug" value={orgSlug} />

      {state?.ok ? (
        <Alert>
          <AlertTitle>{t("exportSuccessTitle")}</AlertTitle>
          <AlertDescription>
            {t("title")} — {state.rowCount}
          </AlertDescription>
        </Alert>
      ) : null}
      {!state?.ok && state?.errors?.form ? (
        <Alert variant="destructive">
          <AlertTitle>{t("exportFailedTitle")}</AlertTitle>
          <AlertDescription>{state.errors.form}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor={startId}>{t("fieldStartDate")}</FieldLabel>
          <Input
            id={startId}
            type="date"
            name="startDate"
            required
            defaultValue={isoDaysAgo(7)}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor={endId}>{t("fieldEndDate")}</FieldLabel>
          <Input
            id={endId}
            type="date"
            name="endDate"
            required
            defaultValue={todayIso()}
          />
        </Field>
      </div>

      <Field>
        <FieldLabel htmlFor={employeeId}>{t("fieldEmployee")}</FieldLabel>
        <Input id={employeeId} type="text" name="employeeId" />
      </Field>

      <Field>
        <FieldLabel htmlFor={deviceId}>{t("fieldDevice")}</FieldLabel>
        <Input id={deviceId} type="text" name="deviceId" />
      </Field>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="onlyExceptions" />
        <span>{t("fieldOnlyExceptions")}</span>
      </label>

      <Button type="submit" disabled={pending} className="self-start">
        {pending ? (
          <>
            <Loader2
              className="size-4 animate-spin"
              data-icon="inline-start"
              aria-hidden
            />
            {t("exporting")}
          </>
        ) : (
          t("exportSubmit")
        )}
      </Button>
    </form>
  )
}
