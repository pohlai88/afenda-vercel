"use client"

import { useActionState, useEffect, useId, useRef } from "react"
import { useTranslations } from "next-intl"
import { Loader2 } from "lucide-react"

import { Alert, AlertDescription } from "#components2/ui/alert"
import { Button } from "#components2/ui/button"
import { Field, FieldLabel } from "#components2/ui/field"
import { Input } from "#components2/ui/input"
import { useRouter } from "#i18n/navigation"

import {
  activateBenefitEnrollmentAction,
  expireBenefitEnrollmentAction,
  suspendBenefitEnrollmentAction,
  terminateBenefitEnrollmentAction,
  waiveBenefitEnrollmentAction,
} from "../actions/benefit-enrollment.actions"

import type { BenefitEnrollmentListRow } from "../data/benefit-model.shared"

export function BenefitEnrollmentRowActions({
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
    return (
      <div className="flex flex-col items-end gap-3">
        <SuspendEnrollmentForm enrollmentId={row.enrollmentId} />
        <ExpireEnrollmentForm enrollmentId={row.enrollmentId} />
        <TerminateEnrollmentForm enrollmentId={row.enrollmentId} />
      </div>
    )
  }
  if (row.state === "suspended") {
    return <ExpireEnrollmentForm enrollmentId={row.enrollmentId} />
  }
  return <span className="text-xs text-muted-foreground">—</span>
}

function SuspendEnrollmentForm({ enrollmentId }: { enrollmentId: string }) {
  const t = useTranslations("Dashboard.Hrm.benefits.enrollmentTable")
  const reasonId = useId()
  const [state, formAction, pending] = useActionState(
    suspendBenefitEnrollmentAction,
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
    <form action={formAction} className="flex w-full max-w-xs flex-col items-end gap-2">
      <input type="hidden" name="enrollmentId" value={enrollmentId} />
      <Input id={reasonId} name="suspensionReason" placeholder={t("suspendReasonPlaceholder")} />
      <Button size="sm" type="submit" variant="outline" disabled={pending}>
        {pending ? t("suspending") : t("suspend")}
      </Button>
    </form>
  )
}

function ExpireEnrollmentForm({ enrollmentId }: { enrollmentId: string }) {
  const t = useTranslations("Dashboard.Hrm.benefits.enrollmentTable")
  const dateId = useId()
  const [state, formAction, pending] = useActionState(
    expireBenefitEnrollmentAction,
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
    <form action={formAction} className="flex w-full max-w-xs flex-col items-end gap-2">
      <input type="hidden" name="enrollmentId" value={enrollmentId} />
      <Input id={dateId} name="effectiveTo" type="date" />
      <Button size="sm" type="submit" variant="secondary" disabled={pending}>
        {pending ? t("expiring") : t("expire")}
      </Button>
    </form>
  )
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
