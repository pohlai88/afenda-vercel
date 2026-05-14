"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { PlusIcon } from "lucide-react"

import { Button } from "#components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "#components/ui/dialog"

import type { LeaveEmployeeChoiceRow } from "../data/leave-request.queries.server"

import { TimeReportApplyForm } from "./time-report-apply-form"

type TimeReportApplyDialogProps = {
  orgSlug: string
  employees: LeaveEmployeeChoiceRow[]
}

export function TimeReportApplyDialog({
  orgSlug,
  employees,
}: TimeReportApplyDialogProps) {
  const t = useTranslations("Dashboard.Hrm.leave.timeReports")
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" type="button" variant="secondary">
          <PlusIcon data-icon="inline-start" aria-hidden />
          {t("applyButton")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("applyDialogTitle")}</DialogTitle>
          <DialogDescription>{t("applyDialogDescription")}</DialogDescription>
        </DialogHeader>
        <TimeReportApplyForm
          orgSlug={orgSlug}
          employees={employees}
          onSuccess={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  )
}
