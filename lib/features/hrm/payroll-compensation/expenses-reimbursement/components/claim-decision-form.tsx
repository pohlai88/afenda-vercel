"use client"

import { useActionState, useState } from "react"
import { useTranslations } from "next-intl"
import { Loader2 } from "lucide-react"

import { Button } from "#components2/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "#components2/ui/dialog"
import { Input } from "#components2/ui/input"
import { Label } from "#components2/ui/label"

import { approveClaimAction } from "../actions/claim-approval.actions"
import type { ClaimApprovalFormState } from "../../../types"

import { ClaimRejectForm } from "./claim-reject-form"
import { ClaimReturnForm } from "./claim-return-form"

type ClaimDecisionFormsProps = {
  claimId: string
  /** Display label (e.g. "Aminah · TRAVEL · 123.45 MYR") used by aria + dialog header. */
  label: string
  requestedAmount: string
  currency: string
}

/**
 * Approve + Reject controls for a single pending claim. Mirrors
 * `LeaveDecisionForms` in shape so the workbench reads consistently
 * across HRM surfaces.
 */
export function ClaimDecisionForms({
  claimId,
  label,
  requestedAmount,
  currency,
}: ClaimDecisionFormsProps) {
  return (
    <div className="flex items-center gap-2">
      <ApproveClaimDialog
        claimId={claimId}
        label={label}
        requestedAmount={requestedAmount}
        currency={currency}
      />
      <ReturnClaimDialog claimId={claimId} label={label} />
      <RejectClaimDialog claimId={claimId} label={label} />
    </div>
  )
}

function ApproveClaimDialog({
  claimId,
  label,
  requestedAmount,
  currency,
}: {
  claimId: string
  label: string
  requestedAmount: string
  currency: string
}) {
  const t = useTranslations("Dashboard.Hrm.claims")
  const [open, setOpen] = useState(false)
  const [state, formAction, pending] = useActionState<
    ClaimApprovalFormState | undefined,
    FormData
  >(approveClaimAction, undefined)

  const error = state && !state.ok ? state.errors : null

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          type="button"
          aria-label={t("approveAria", { employee: label })}
        >
          {t("approve")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("approveDialogTitle")}</DialogTitle>
          <DialogDescription>{label}</DialogDescription>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="claimId" value={claimId} />
          <div className="flex flex-col gap-2">
            <Label htmlFor={`approved-amount-${claimId}`}>
              {t("fieldApprovedAmount")}
            </Label>
            <Input
              id={`approved-amount-${claimId}`}
              name="approvedAmount"
              type="number"
              step="0.01"
              min="0.01"
              max={requestedAmount}
              defaultValue={requestedAmount}
              required
            />
            <p className="text-xs text-muted-foreground">
              {t("approvePartialHint", {
                requested: requestedAmount,
                currency,
              })}
            </p>
          </div>
          {error?.form ? (
            <p className="text-sm text-destructive">{error.form}</p>
          ) : error?.claimId ? (
            <p className="text-sm text-destructive">{error.claimId}</p>
          ) : null}
          <Button type="submit" disabled={pending}>
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
        </form>
      </DialogContent>
    </Dialog>
  )
}

function ReturnClaimDialog({
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
          variant="secondary"
          type="button"
          aria-label={t("returnAria", { employee: label })}
        >
          {t("return")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("return")}</DialogTitle>
          <DialogDescription>{label}</DialogDescription>
        </DialogHeader>
        <ClaimReturnForm claimId={claimId} onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
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
