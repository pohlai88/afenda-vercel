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

import type { LeaveEmployeeChoiceRow } from "../../../workforce-time-attendance/data/leave-request.queries.server"

import { BenefitLifeEventRecordForm } from "./benefit-life-event-record-form"

type BenefitLifeEventRecordDialogProps = {
  employees: ReadonlyArray<LeaveEmployeeChoiceRow>
}

export function BenefitLifeEventRecordDialog({
  employees,
}: BenefitLifeEventRecordDialogProps) {
  const t = useTranslations("Dashboard.Hrm.benefits")
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" type="button">
          <PlusIcon data-icon="inline-start" aria-hidden />
          {t("recordLifeEvent")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("lifeEventDialogTitle")}</DialogTitle>
          <DialogDescription>
            {t("lifeEventDialogDescription")}
          </DialogDescription>
        </DialogHeader>
        <BenefitLifeEventRecordForm
          employees={employees}
          onSuccess={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  )
}
