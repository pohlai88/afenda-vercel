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

import {
  approveLeaveAction,
  type LeaveApprovalFormState,
} from "#features/hrm/client"

import { LeaveRejectForm } from "./leave-reject-form"

type LeaveDecisionFormsProps = {
  requestId: string
  /** Human-readable date span (e.g. "2026-05-12 ÔåÆ 2026-05-15"); used by aria-labels and the reject dialog header. */
  dateRange: string
}

/**
 * Approve + Reject controls for a single pending leave request.
 *
 * - **Approve** is a one-click inline form (no extra modal); the audit
 *   event captures the actor + immutable approval snapshot, so we keep
 *   the affordance fast.
 * - **Reject** opens a small dialog because the rejection reason is
 *   required by `leaveRejectDecisionSchema`. The form body lives in
 *   {@link LeaveRejectForm} so the dialog-close callback reads as a
 *   normal function across the component boundary.
 */
export function LeaveDecisionForms({
  requestId,
  dateRange,
}: LeaveDecisionFormsProps) {
  return (
    <div className="flex items-center gap-2">
      <ApproveLeaveButton requestId={requestId} dateRange={dateRange} />
      <RejectLeaveDialog requestId={requestId} dateRange={dateRange} />
    </div>
  )
}

function ApproveLeaveButton({
  requestId,
  dateRange,
}: {
  requestId: string
  dateRange: string
}) {
  const t = useTranslations("Dashboard.Hrm.leave")
  const [state, formAction, pending] = useActionState<
    LeaveApprovalFormState | undefined,
    FormData
  >(approveLeaveAction, undefined)

  const error = state && !state.ok ? state.errors : null

  return (
    <form
      action={formAction}
      className="inline-flex items-center gap-2"
      aria-label={t("approveAria", { dates: dateRange })}
    >
      <input type="hidden" name="requestId" value={requestId} />
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
      ) : error?.requestId ? (
        <span className="text-xs text-destructive">{error.requestId}</span>
      ) : null}
    </form>
  )
}

function RejectLeaveDialog({
  requestId,
  dateRange,
}: {
  requestId: string
  dateRange: string
}) {
  const t = useTranslations("Dashboard.Hrm.leave")
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant="destructive"
          type="button"
          aria-label={t("rejectAria", { dates: dateRange })}
        >
          {t("reject")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("reject")}</DialogTitle>
          <DialogDescription>{dateRange}</DialogDescription>
        </DialogHeader>
        <LeaveRejectForm
          requestId={requestId}
          onSuccess={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  )
}
