"use client"

import { useActionState } from "react"
import { useTranslations } from "next-intl"
import { Loader2 } from "lucide-react"

import { Button } from "#components2/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#components2/ui/card"
import { Field, FieldError, FieldLabel } from "#components2/ui/field"
import { Input } from "#components2/ui/input"

import { updateAatThresholdAction } from "../actions/aat.actions"
import type { AatThresholdConfig } from "../schemas/aat-threshold.schema"
import type { UpdateAatThresholdFormState } from "../schemas/aat-threshold-action.schema"

type AatThresholdSettingsFormProps = {
  thresholds: AatThresholdConfig
}

function rateFieldValue(rate: number): string {
  return (rate * 100).toFixed(1)
}

export function AatThresholdSettingsForm({
  thresholds,
}: AatThresholdSettingsFormProps) {
  const t = useTranslations("Dashboard.Hrm.absenceAnalytics")
  const [state, formAction, pending] = useActionState<
    UpdateAatThresholdFormState | undefined,
    FormData
  >(updateAatThresholdAction, undefined)

  const errors = state && !state.ok ? state.errors : null

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="text-base">{t("thresholdTitle")}</CardTitle>
        <CardDescription>{t("thresholdDescription")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="grid gap-4 sm:grid-cols-2">
          {errors?.form ? (
            <p className="text-sm text-destructive sm:col-span-2" role="alert">
              {errors.form}
            </p>
          ) : null}
          <Field>
            <FieldLabel htmlFor="watchAbsenceRate">
              {t("fieldWatchAbsenceRate")}
            </FieldLabel>
            <Input
              id="watchAbsenceRate"
              name="watchAbsenceRate"
              type="number"
              step="0.1"
              min={0}
              max={100}
              defaultValue={rateFieldValue(thresholds.watchAbsenceRate)}
              disabled={pending}
            />
            {errors?.watchAbsenceRate ? (
              <FieldError>{errors.watchAbsenceRate}</FieldError>
            ) : null}
          </Field>
          <Field>
            <FieldLabel htmlFor="atRiskAbsenceRate">
              {t("fieldAtRiskAbsenceRate")}
            </FieldLabel>
            <Input
              id="atRiskAbsenceRate"
              name="atRiskAbsenceRate"
              type="number"
              step="0.1"
              min={0}
              max={100}
              defaultValue={rateFieldValue(thresholds.atRiskAbsenceRate)}
              disabled={pending}
            />
            {errors?.atRiskAbsenceRate ? (
              <FieldError>{errors.atRiskAbsenceRate}</FieldError>
            ) : null}
          </Field>
          <Field>
            <FieldLabel htmlFor="highRiskAbsenceRate">
              {t("fieldHighRiskAbsenceRate")}
            </FieldLabel>
            <Input
              id="highRiskAbsenceRate"
              name="highRiskAbsenceRate"
              type="number"
              step="0.1"
              min={0}
              max={100}
              defaultValue={rateFieldValue(thresholds.highRiskAbsenceRate)}
              disabled={pending}
            />
            {errors?.highRiskAbsenceRate ? (
              <FieldError>{errors.highRiskAbsenceRate}</FieldError>
            ) : null}
          </Field>
          <Field>
            <FieldLabel htmlFor="criticalAbsenceRate">
              {t("fieldCriticalAbsenceRate")}
            </FieldLabel>
            <Input
              id="criticalAbsenceRate"
              name="criticalAbsenceRate"
              type="number"
              step="0.1"
              min={0}
              max={100}
              defaultValue={rateFieldValue(thresholds.criticalAbsenceRate)}
              disabled={pending}
            />
            {errors?.criticalAbsenceRate ? (
              <FieldError>{errors.criticalAbsenceRate}</FieldError>
            ) : null}
          </Field>
          <Field>
            <FieldLabel htmlFor="watchFrequency">
              {t("fieldWatchFrequency")}
            </FieldLabel>
            <Input
              id="watchFrequency"
              name="watchFrequency"
              type="number"
              min={0}
              defaultValue={String(thresholds.watchFrequency)}
              disabled={pending}
            />
            {errors?.watchFrequency ? (
              <FieldError>{errors.watchFrequency}</FieldError>
            ) : null}
          </Field>
          <Field>
            <FieldLabel htmlFor="atRiskFrequency">
              {t("fieldAtRiskFrequency")}
            </FieldLabel>
            <Input
              id="atRiskFrequency"
              name="atRiskFrequency"
              type="number"
              min={0}
              defaultValue={String(thresholds.atRiskFrequency)}
              disabled={pending}
            />
            {errors?.atRiskFrequency ? (
              <FieldError>{errors.atRiskFrequency}</FieldError>
            ) : null}
          </Field>
          <Field className="sm:col-span-2">
            <FieldLabel htmlFor="highRiskFrequency">
              {t("fieldHighRiskFrequency")}
            </FieldLabel>
            <Input
              id="highRiskFrequency"
              name="highRiskFrequency"
              type="number"
              min={0}
              defaultValue={String(thresholds.highRiskFrequency)}
              disabled={pending}
            />
            {errors?.highRiskFrequency ? (
              <FieldError>{errors.highRiskFrequency}</FieldError>
            ) : null}
          </Field>
          <div className="flex items-center gap-3 sm:col-span-2">
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? (
                <>
                  <Loader2
                    className="size-4 animate-spin"
                    data-icon="inline-start"
                    aria-hidden
                  />
                  {t("savingThresholds")}
                </>
              ) : (
                t("saveThresholds")
              )}
            </Button>
            {state?.ok ? (
              <p className="text-sm text-muted-foreground">
                {t("thresholdSaved")}
              </p>
            ) : null}
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
