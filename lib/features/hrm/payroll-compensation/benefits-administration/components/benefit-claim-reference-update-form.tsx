"use client"

import { useActionState, useEffect, useId, useMemo, useRef } from "react"
import { useTranslations } from "next-intl"
import { Loader2 } from "lucide-react"

import { Button } from "#components/ui/button"
import { FieldError } from "#components/ui/field"
import { Input } from "#components/ui/input"

import { useRouter } from "#i18n/navigation"

import { updateBenefitClaimReferenceAction } from "../client"
import { BENEFIT_CLAIM_STATUSES } from "../data/benefit-helpers.shared"
import type { BenefitEnrollmentTransitionFormState } from "../../../types"

const SELECT_CLASS =
  "h-8 rounded border border-border bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"

type BenefitClaimReferenceUpdateFormProps = {
  claimReferenceId: string
  claimStatus: string
  claimedAmount: string | null
  paymentReference: string | null
}

export function BenefitClaimReferenceUpdateForm({
  claimReferenceId,
  claimStatus,
  claimedAmount,
  paymentReference,
}: BenefitClaimReferenceUpdateFormProps) {
  const t = useTranslations("Dashboard.Hrm.benefits.claimReferenceForm")
  const router = useRouter()
  const statusId = useId()
  const amountId = useId()
  const paymentId = useId()
  const [state, formAction, pending] = useActionState<
    BenefitEnrollmentTransitionFormState | undefined,
    FormData
  >(updateBenefitClaimReferenceAction, undefined)

  const didRefresh = useRef(false)
  useEffect(() => {
    if (state?.ok && !didRefresh.current) {
      didRefresh.current = true
      router.refresh()
    }
  }, [state, router])

  const fieldErrors = useMemo(() => {
    if (!state || state.ok) return null
    return state.errors
  }, [state])

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="claimReferenceId" value={claimReferenceId} />
      <select
        id={statusId}
        name="claimStatus"
        className={SELECT_CLASS}
        defaultValue={claimStatus}
        aria-label={t("fieldClaimStatus")}
      >
        {BENEFIT_CLAIM_STATUSES.map((status) => (
          <option key={status} value={status}>
            {t(`claimStatuses.${status}`)}
          </option>
        ))}
      </select>
      <Input
        id={amountId}
        name="claimedAmount"
        type="number"
        min={0}
        step="0.01"
        className="h-8 w-28"
        defaultValue={claimedAmount ?? ""}
        aria-label={t("fieldClaimedAmount")}
      />
      <Input
        id={paymentId}
        name="paymentReference"
        maxLength={256}
        className="h-8 min-w-32 flex-1"
        defaultValue={paymentReference ?? ""}
        aria-label={t("fieldPaymentReference")}
      />
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        {pending ? (
          <Loader2 className="size-4 animate-spin" aria-hidden />
        ) : (
          t("submitUpdate")
        )}
      </Button>
      {fieldErrors?.form ? (
        <FieldError className="w-full">{fieldErrors.form}</FieldError>
      ) : null}
    </form>
  )
}
