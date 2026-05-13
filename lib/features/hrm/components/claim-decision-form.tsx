"use client"

import { useActionState, useState } from "react"
import { useTranslations } from "next-intl"
import { Loader2 } from "lucide-react"

import { Button } from "#components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "#components/ui/dialog"

import {
  approveClaimAction,
  type ClaimApprovalFormState,
} from "#features/hrm/client"

import { ClaimRejectForm } from "./claim-reject-form"

type ClaimDecisionFormsProps = {
  claimId: string
  /** Display label (e.g. "Aminah · TRAVEL · 123.45 MYR") used by aria + dialog header. */
  label: string
}

/**
 * Approve + Reject controls for a single pending claim. Mirrors
 * `LeaveDecisionForms` in shape so the workbench reads consistently
 * across HRM surfaces.
 */
export function ClaimDecisionForms({
  claimId,
  label,
}: ClaimDecisionFormsProps) {
  return (
    <div className="flex items-center gap-2">
      <ApproveClaimButton claimId={claimId} label={label} />
      <RejectClaimDialog claimId={claimId} label={label} />
    </div>
  )
}

function ApproveClaimButton({
  claimId,
  label,
}: {
  claimId: string
  label: string
}) {
  const t = useTranslations("Dashboard.Hrm.claims")
  const [state, formAction, pending] = useActionState<
    ClaimApprovalFormState | undefined,
    FormData
  >(approveClaimAction, undefined)

  const error = state && !state.ok ? state.errors : null

  return (
    <form
      action={formAction}
      className="inline-flex items-center gap-2"
      aria-label={t("approveAria", { employee: label })}
    >
      <input type="hidden" name="claimId" value={claimId} />
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        {pending ? (
          <>
            <Loader2
              className="size-4 animate-spin"
              data-icon="inline-start"
              aria-hidden
            />
            {t("approving")}
          </>
        ) : (
          t("approve")
        )}
      </Button>
      {error?.form ? (
        <span className="text-xs text-destructive">{error.form}</span>
      ) : error?.claimId ? (
        <span className="text-xs text-destructive">{error.claimId}</span>
      ) : null}
    </form>
  )
}

function RejectClaimDialog({
  claimId,
  label,
}: {
  claimId: string
  label: string
}) {
  const t = useTranslations("Dashboard.Hrm.claims")
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant="destructive"
          type="button"
          aria-label={t("rejectAria", { employee: label })}
        >
          {t("reject")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("reject")}</DialogTitle>
          <DialogDescription>{label}</DialogDescription>
        </DialogHeader>
        <ClaimRejectForm claimId={claimId} onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  )
}
