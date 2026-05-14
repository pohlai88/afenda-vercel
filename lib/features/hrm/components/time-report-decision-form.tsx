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
  approveTimeReportAction,
  type TimeReportApprovalFormState,
} from "#features/hrm/client"

import { TimeReportRejectForm } from "./time-report-reject-form"

type TimeReportDecisionFormsProps = {
  reportId: string
  detail: string
}

export function TimeReportDecisionForms({
  reportId,
  detail,
}: TimeReportDecisionFormsProps) {
  return (
    <div className="flex items-center gap-2">
      <ApproveTimeReportButton reportId={reportId} detail={detail} />
      <RejectTimeReportDialog reportId={reportId} detail={detail} />
    </div>
  )
}

function ApproveTimeReportButton({
  reportId,
  detail,
}: {
  reportId: string
  detail: string
}) {
  const t = useTranslations("Dashboard.Hrm.leave.timeReports")
  const [state, formAction, pending] = useActionState<
    TimeReportApprovalFormState | undefined,
    FormData
  >(approveTimeReportAction, undefined)

  const error = state && !state.ok ? state.errors : null

  return (
    <form
      action={formAction}
      className="inline-flex items-center gap-2"
      aria-label={t("approveAria", { detail })}
    >
      <input type="hidden" name="reportId" value={reportId} />
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
      ) : error?.reportId ? (
        <span className="text-xs text-destructive">{error.reportId}</span>
      ) : null}
    </form>
  )
}

function RejectTimeReportDialog({
  reportId,
  detail,
}: {
  reportId: string
  detail: string
}) {
  const t = useTranslations("Dashboard.Hrm.leave.timeReports")
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant="destructive"
          type="button"
          aria-label={t("rejectAria", { detail })}
        >
          {t("reject")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("reject")}</DialogTitle>
          <DialogDescription>{detail}</DialogDescription>
        </DialogHeader>
        <TimeReportRejectForm
          reportId={reportId}
          onSuccess={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  )
}
