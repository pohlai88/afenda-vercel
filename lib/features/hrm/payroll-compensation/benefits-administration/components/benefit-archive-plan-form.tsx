"use client"

import { useActionState, useEffect, useId, useMemo, useRef } from "react"
import { useTranslations } from "next-intl"
import { Loader2 } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "#components/ui/alert"
import { Button } from "#components/ui/button"
import { FieldError } from "#components/ui/field"
import { useRouter } from "#i18n/navigation"

import { archiveBenefitPlanAction } from "../actions/benefit-plan.actions"
import type { BenefitArchiveFormState } from "../../../types"

type BenefitArchivePlanFormProps = {
  planId: string
  planLabel: string
}

export function BenefitArchivePlanForm({
  planId,
  planLabel,
}: BenefitArchivePlanFormProps) {
  const t = useTranslations("Dashboard.Hrm.benefits")
  const router = useRouter()
  const formId = useId()
  const [state, formAction, pending] = useActionState<
    BenefitArchiveFormState | undefined,
    FormData
  >(archiveBenefitPlanAction, undefined)

  const fieldErrors = useMemo(() => {
    if (!state || state.ok) return null
    return state.errors
  }, [state])

  const didRefresh = useRef(false)
  useEffect(() => {
    if (state?.ok && !didRefresh.current) {
      didRefresh.current = true
      router.refresh()
    }
  }, [state, router])

  return (
    <form
      id={formId}
      action={formAction}
      className="inline-flex flex-col items-start gap-1"
    >
      <input type="hidden" name="planId" value={planId} />
      {fieldErrors?.form ? (
        <Alert variant="destructive" className="max-w-xs">
          <AlertTitle>{t("archiveErrorTitle")}</AlertTitle>
          <AlertDescription>{fieldErrors.form}</AlertDescription>
        </Alert>
      ) : null}
      {fieldErrors?.planId ? (
        <FieldError>{fieldErrors.planId}</FieldError>
      ) : null}
      <Button
        size="sm"
        type="submit"
        variant="destructive"
        disabled={pending}
        title={t("archivePlanConfirm", { label: planLabel })}
      >
        {pending ? (
          <>
            <Loader2
              className="size-4 animate-spin"
              data-icon="inline-start"
              aria-hidden
            />
            {t("archiving")}
          </>
        ) : (
          t("archivePlan")
        )}
      </Button>
    </form>
  )
}
