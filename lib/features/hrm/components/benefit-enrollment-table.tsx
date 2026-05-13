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
  activateBenefitEnrollmentAction,
  terminateBenefitEnrollmentAction,
  waiveBenefitEnrollmentAction,
} from "#features/hrm/client"

import type { BenefitEnrollmentListRow } from "../data/benefit-model.shared"
import {
  isBenefitCoverageLevel,
  isBenefitEnrollmentState,
  type BenefitCoverageLevel,
  type BenefitEnrollmentState,
} from "../data/benefit-helpers.shared"

type BenefitEnrollmentTableProps = {
  isAdmin: boolean
  rows: readonly BenefitEnrollmentListRow[]
}

function stateVariant(
  state: string
): "default" | "secondary" | "success" | "outline" | "warning" {
  if (state === "active") return "success"
  if (state === "pending") return "warning"
  if (state === "waived") return "secondary"
  if (state === "terminated") return "outline"
  return "default"
}

function isoDay(value: Date | null): string {
  if (!value) return ""
  return value.toISOString().slice(0, 10)
}

export function BenefitEnrollmentTable({
  isAdmin,
  rows,
}: BenefitEnrollmentTableProps) {
  const t = useTranslations("Dashboard.Hrm.benefits.enrollmentTable")

  function coverageLabel(coverageLevel: BenefitCoverageLevel): string {
    switch (coverageLevel) {
      case "employee_only":
        return t("coverageLevels.employee_only")
      case "employee_spouse":
        return t("coverageLevels.employee_spouse")
      case "employee_children":
        return t("coverageLevels.employee_children")
      case "employee_family":
        return t("coverageLevels.employee_family")
    }
  }

  function enrollmentStateLabel(state: BenefitEnrollmentState): string {
    switch (state) {
      case "pending":
        return t("states.pending")
      case "active":
        return t("states.active")
      case "waived":
        return t("states.waived")
      case "terminated":
        return t("states.terminated")
    }
  }

  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("empty")}</p>
  }

  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="w-full min-w-[720px] caption-bottom text-sm">
        <thead className="border-b border-border bg-muted/40">
          <tr>
            <th className="px-3 py-2 text-start font-medium">
              {t("colEmployee")}
            </th>
            <th className="px-3 py-2 text-start font-medium">{t("colPlan")}</th>
            <th className="px-3 py-2 text-start font-medium">
              {t("colCoverage")}
            </th>
            <th className="px-3 py-2 text-start font-medium">
              {t("colState")}
            </th>
            <th className="px-3 py-2 text-start font-medium">
              {t("colEffective")}
            </th>
            {isAdmin ? (
              <th className="px-3 py-2 text-end font-medium">
                {t("colActions")}
              </th>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.enrollmentId}
              className="border-b border-border last:border-0"
            >
              <td className="px-3 py-2 align-top">
                <div className="font-medium">{row.employeeLegalName}</div>
                <div className="text-xs text-muted-foreground">
                  {row.employeeNumber}
                </div>
              </td>
              <td className="px-3 py-2 align-top">
                <div>{row.benefitName}</div>
                <div className="font-mono text-xs text-muted-foreground">
                  {row.benefitCode}
                </div>
              </td>
              <td className="px-3 py-2 align-top text-muted-foreground">
                {row.coverageLevel && isBenefitCoverageLevel(row.coverageLevel)
                  ? coverageLabel(row.coverageLevel)
                  : (row.coverageLevel ?? "—")}
              </td>
              <td className="px-3 py-2 align-top">
                <Badge variant={stateVariant(row.state)}>
                  {isBenefitEnrollmentState(row.state)
                    ? enrollmentStateLabel(row.state)
                    : row.state}
                </Badge>
              </td>
              <td className="px-3 py-2 align-top text-muted-foreground">
                {isoDay(row.effectiveFrom)}
              </td>
              {isAdmin ? (
                <td className="px-3 py-2 text-end align-top">
                  <BenefitEnrollmentRowActions row={row} />
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function BenefitEnrollmentRowActions({
  row,
}: {
  row: BenefitEnrollmentListRow
}) {
  if (row.state === "pending") {
    return (
      <div className="flex flex-col items-end gap-3">
        <ActivateEnrollmentButton enrollmentId={row.enrollmentId} />
        <WaiveEnrollmentForm enrollmentId={row.enrollmentId} />
      </div>
    )
  }
  if (row.state === "active") {
    return <TerminateEnrollmentForm enrollmentId={row.enrollmentId} />
  }
  return <span className="text-xs text-muted-foreground">—</span>
}

function ActivateEnrollmentButton({ enrollmentId }: { enrollmentId: string }) {
  const t = useTranslations("Dashboard.Hrm.benefits.enrollmentTable")
  const [state, formAction, pending] = useActionState(
    activateBenefitEnrollmentAction,
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
    <form action={formAction} className="flex flex-col items-end gap-1">
      <input type="hidden" name="enrollmentId" value={enrollmentId} />
      {err ? (
        <Alert variant="destructive" className="py-2">
          <AlertDescription className="text-xs">{err}</AlertDescription>
        </Alert>
      ) : null}
      <Button size="sm" type="submit" disabled={pending}>
        {pending ? (
          <>
            <Loader2
              className="size-4 animate-spin"
              data-icon="inline-start"
              aria-hidden
            />
            {t("activating")}
          </>
        ) : (
          t("activate")
        )}
      </Button>
    </form>
  )
}

function WaiveEnrollmentForm({ enrollmentId }: { enrollmentId: string }) {
  const t = useTranslations("Dashboard.Hrm.benefits.enrollmentTable")
  const reasonId = useId()
  const [state, formAction, pending] = useActionState(
    waiveBenefitEnrollmentAction,
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
      <input type="hidden" name="enrollmentId" value={enrollmentId} />
      {err ? (
        <Alert variant="destructive" className="py-2">
          <AlertDescription className="text-xs">{err}</AlertDescription>
        </Alert>
      ) : null}
      <Field className="w-full">
        <FieldLabel htmlFor={reasonId} className="text-xs">
          {t("waiveReasonOptional")}
        </FieldLabel>
        <Input
          id={reasonId}
          name="waivedReason"
          maxLength={2000}
          placeholder={t("waiveReasonPlaceholder")}
        />
      </Field>
      <Button size="sm" type="submit" variant="outline" disabled={pending}>
        {pending ? (
          <>
            <Loader2
              className="size-4 animate-spin"
              data-icon="inline-start"
              aria-hidden
            />
            {t("waiving")}
          </>
        ) : (
          t("waive")
        )}
      </Button>
    </form>
  )
}

function TerminateEnrollmentForm({ enrollmentId }: { enrollmentId: string }) {
  const t = useTranslations("Dashboard.Hrm.benefits.enrollmentTable")
  const reasonId = useId()
  const dateId = useId()
  const [state, formAction, pending] = useActionState(
    terminateBenefitEnrollmentAction,
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
      <input type="hidden" name="enrollmentId" value={enrollmentId} />
      {err ? (
        <Alert variant="destructive" className="py-2">
          <AlertDescription className="text-xs">{err}</AlertDescription>
        </Alert>
      ) : null}
      <Field className="w-full">
        <FieldLabel htmlFor={dateId} className="text-xs">
          {t("terminateDateOptional")}
        </FieldLabel>
        <Input id={dateId} name="terminatedAt" type="date" />
      </Field>
      <Field className="w-full">
        <FieldLabel htmlFor={reasonId} className="text-xs">
          {t("terminateReasonOptional")}
        </FieldLabel>
        <Input id={reasonId} name="terminationReason" maxLength={2000} />
      </Field>
      <Button size="sm" type="submit" variant="destructive" disabled={pending}>
        {pending ? (
          <>
            <Loader2
              className="size-4 animate-spin"
              data-icon="inline-start"
              aria-hidden
            />
            {t("terminating")}
          </>
        ) : (
          t("terminate")
        )}
      </Button>
    </form>
  )
}
