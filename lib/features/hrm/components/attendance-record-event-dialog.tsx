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

import type { AttendanceEmployeeChoiceRow } from "../data/attendance.queries.server"

import { AttendanceRecordEventForm } from "./attendance-record-event-form"

type AttendanceRecordEventDialogProps = {
  orgSlug: string
  employees: AttendanceEmployeeChoiceRow[]
}

/**
 * Trigger + Dialog wrapper for the record-attendance-event form. Owns
 * only `open`; the form body lives in {@link AttendanceRecordEventForm}
 * so the cross-component `onSuccess` close is a normal callback (not a
 * `setState` inside an effect) — same shape as `LeaveApplyDialog`.
 */
export function AttendanceRecordEventDialog({
  orgSlug,
  employees,
}: AttendanceRecordEventDialogProps) {
  const t = useTranslations("Dashboard.Hrm.attendance")
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" type="button">
          <PlusIcon data-icon="inline-start" aria-hidden />
          {t("recordEvent")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("recordDialogTitle")}</DialogTitle>
          <DialogDescription>{t("recordDialogDescription")}</DialogDescription>
        </DialogHeader>
        <AttendanceRecordEventForm
          orgSlug={orgSlug}
          employees={employees}
          onSuccess={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  )
}
