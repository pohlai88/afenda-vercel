"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"

import { Button } from "#components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "#components/ui/dialog"

import { TimeReportCancelForm } from "./time-report-cancel-form"

type TimeReportCancelButtonProps = {
  reportId: string
  detail: string
}

export function TimeReportCancelButton({
  reportId,
  detail,
}: TimeReportCancelButtonProps) {
  const t = useTranslations("Dashboard.Hrm.leave.timeReports")
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost" type="button">
          {t("cancelReport")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("cancelReport")}</DialogTitle>
          <DialogDescription>
            {t("cancelDialogDescription", { detail })}
          </DialogDescription>
        </DialogHeader>
        <TimeReportCancelForm
          reportId={reportId}
          onSuccess={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  )
}
