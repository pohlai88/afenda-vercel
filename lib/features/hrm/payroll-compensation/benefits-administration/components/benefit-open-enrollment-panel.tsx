"use client"

import { useActionState, useEffect, useId, useRef } from "react"
import { useTranslations } from "next-intl"
import { Loader2 } from "lucide-react"

import { Alert, AlertDescription } from "#components/ui/alert"
import { Badge } from "#components/ui/badge"
import { Button } from "#components/ui/button"
import { Field, FieldLabel } from "#components/ui/field"
import { Input } from "#components/ui/input"
import { useRouter } from "#i18n/navigation"

import {
  closeBenefitOpenEnrollmentAction,
  createBenefitOpenEnrollmentAction,
} from "../actions/benefit-open-enrollment.actions"
import type { BenefitOpenEnrollmentFormState } from "../../../types"

import type { BenefitOpenEnrollmentRow } from "../data/benefit-model.shared"
import type { BenefitPlanChoiceRow } from "./benefit-enrollment-form"

type BenefitOpenEnrollmentPanelProps = {
  isAdmin: boolean
  windows: readonly BenefitOpenEnrollmentRow[]
  plans: readonly BenefitPlanChoiceRow[]
}

function isoDay(value: Date): string {
  return value.toISOString().slice(0, 10)
}

export function BenefitOpenEnrollmentPanel({
  isAdmin,
  windows,
  plans,
}: BenefitOpenEnrollmentPanelProps) {
  const t = useTranslations("Dashboard.Hrm.benefits")

  if (!isAdmin) {
    return (
      <p className="text-sm text-muted-foreground">{t("openEnrollment.memberReadOnly")}</p>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <CreateOpenEnrollmentForm plans={plans} />
      <OpenEnrollmentWindowsTable windows={windows} />
    </div>
  )
}

function CreateOpenEnrollmentForm({
  plans,
}: {
  plans: readonly BenefitPlanChoiceRow[]
}) {
  const t = useTranslations("Dashboard.Hrm.benefits")
  const [state, formAction, pending] = useActionState<
    BenefitOpenEnrollmentFormState | undefined,
    FormData
  >(createBenefitOpenEnrollmentAction, undefined)

  const nameId = useId()
  const startsId = useId()
  const endsId = useId()
  const router = useRouter()
  const did = useRef(false)

  useEffect(() => {
    if (state?.ok && !did.current) {
      did.current = true
      router.refresh()
    }
  }, [state, router])

  const err = state && !state.ok ? state.errors : null

  return (
    <form
      action={formAction}
      className="flex flex-col gap-4 rounded-md border border-border p-4"
    >
      <h3 className="text-sm font-medium">{t("openEnrollment.createTitle")}</h3>
      {err?.form ? (
        <Alert variant="destructive">
          <AlertDescription>{err.form}</AlertDescription>
        </Alert>
      ) : null}
      <Field>
        <FieldLabel htmlFor={nameId}>{t("openEnrollment.fieldName")}</FieldLabel>
        <Input id={nameId} name="name" required maxLength={256} />
        {err?.name ? (
          <p className="text-xs text-destructive">{err.name}</p>
        ) : null}
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor={startsId}>{t("openEnrollment.fieldStartsOn")}</FieldLabel>
          <Input id={startsId} name="startsOn" type="date" required />
          {err?.startsOn ? (
            <p className="text-xs text-destructive">{err.startsOn}</p>
          ) : null}
        </Field>
        <Field>
          <FieldLabel htmlFor={endsId}>{t("openEnrollment.fieldEndsOn")}</FieldLabel>
          <Input id={endsId} name="endsOn" type="date" required />
          {err?.endsOn ? (
            <p className="text-xs text-destructive">{err.endsOn}</p>
          ) : null}
        </Field>
      </div>
      {plans.length > 0 ? (
        <Field>
          <FieldLabel>{t("openEnrollment.fieldPlans")}</FieldLabel>
          <p className="mb-2 text-xs text-muted-foreground">
            {t("openEnrollment.fieldPlansHint")}
          </p>
          <div className="flex flex-col gap-2">
            {plans.map((plan) => (
              <label key={plan.id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="planIds" value={plan.id} />
                <span>
                  {plan.code} — {plan.name}
                </span>
              </label>
            ))}
          </div>
        </Field>
      ) : null}
      <Button type="submit" disabled={pending} className="self-start">
        {pending ? (
          <>
            <Loader2
              className="size-4 animate-spin"
              data-icon="inline-start"
              aria-hidden
            />
            {t("openEnrollment.creating")}
          </>
        ) : (
          t("openEnrollment.createSubmit")
        )}
      </Button>
    </form>
  )
}

function OpenEnrollmentWindowsTable({
  windows,
}: {
  windows: readonly BenefitOpenEnrollmentRow[]
}) {
  const t = useTranslations("Dashboard.Hrm.benefits")

  if (windows.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("openEnrollment.empty")}</p>
  }

  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="w-full min-w-[640px] caption-bottom text-sm">
        <thead className="border-b border-border bg-muted/40">
          <tr>
            <th className="px-3 py-2 text-start font-medium">{t("openEnrollment.colName")}</th>
            <th className="px-3 py-2 text-start font-medium">
              {t("openEnrollment.colPeriod")}
            </th>
            <th className="px-3 py-2 text-start font-medium">{t("openEnrollment.colPlans")}</th>
            <th className="px-3 py-2 text-start font-medium">
              {t("openEnrollment.colStatus")}
            </th>
            <th className="px-3 py-2 text-end font-medium">{t("openEnrollment.colActions")}</th>
          </tr>
        </thead>
        <tbody>
          {windows.map((row) => (
            <tr key={row.id} className="border-b border-border last:border-0">
              <td className="px-3 py-2 align-top font-medium">{row.name}</td>
              <td className="px-3 py-2 align-top text-muted-foreground">
                {isoDay(row.startsOn)} — {isoDay(row.endsOn)}
              </td>
              <td className="px-3 py-2 align-top text-muted-foreground">
                {row.planIds.length > 0 ? row.planIds.length : t("openEnrollment.allPlans")}
              </td>
              <td className="px-3 py-2 align-top">
                <Badge variant={row.isActive ? "success" : "secondary"}>
                  {row.isActive ? t("openEnrollment.statusActive") : t("openEnrollment.statusClosed")}
                </Badge>
              </td>
              <td className="px-3 py-2 text-end align-top">
                {row.isActive ? <CloseWindowButton windowId={row.id} /> : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function CloseWindowButton({ windowId }: { windowId: string }) {
  const t = useTranslations("Dashboard.Hrm.benefits")
  const [state, formAction, pending] = useActionState(
    closeBenefitOpenEnrollmentAction,
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

  return (
    <form action={formAction}>
      <input type="hidden" name="windowId" value={windowId} />
      <Button size="sm" type="submit" variant="outline" disabled={pending}>
        {pending ? t("openEnrollment.closing") : t("openEnrollment.close")}
      </Button>
    </form>
  )
}
