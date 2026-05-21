"use client"

import { useActionState } from "react"
import { useTranslations } from "next-intl"

import { Loader2 } from "lucide-react"

import { Button } from "#components2/ui/button"

import { approveAttendanceCorrectionAction } from "#features/hrm/client"

type AttendanceCorrectionApproveButtonProps = {
  approvalId: string
}

export function AttendanceCorrectionApproveButton({
  approvalId,
}: AttendanceCorrectionApproveButtonProps) {
  const t = useTranslations("Dashboard.Hrm.attendance")
  const [, formAction, pending] = useActionState(
    approveAttendanceCorrectionAction,
    undefined
  )

  return (
    <form action={formAction}>
      <input type="hidden" name="approvalId" value={approvalId} />
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        {pending ? (
          <Loader2 className="size-4 animate-spin" aria-hidden />
        ) : null}
        {t("correctionPendingApprove")}
      </Button>
    </form>
  )
}
