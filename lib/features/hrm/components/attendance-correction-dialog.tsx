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

import { AttendanceCorrectionForm } from "./attendance-correction-form"

type AttendanceCorrectionDialogProps = {
  originalEventId: string
  /** ISO timestamp of the original event — used to seed the form date input. */
  occurredAtIso: string
  /** Original event type — used to seed the form's event-type picker. */
  eventType: string
}

/**
 * Trigger + Dialog wrapper for the correction form. Owns only `open`;
 * the form body lives in {@link AttendanceCorrectionForm} so the
 * cross-component `onSuccess` close is a normal callback (mirrors the
 * `LeaveRejectDialog` shape).
 */
export function AttendanceCorrectionDialog({
  originalEventId,
  occurredAtIso,
  eventType,
}: AttendanceCorrectionDialogProps) {
  const t = useTranslations("Dashboard.Hrm.attendance")
  const [open, setOpen] = useState(false)

  // Pretty timestamp for the trigger's aria-label only — the form uses
  // the raw ISO string for `defaultValue` because <input type="datetime-local">
  // requires a "YYYY-MM-DDTHH:mm" shape.
  const occurredAtLocalLabel = new Date(occurredAtIso).toLocaleString()

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant="ghost"
          type="button"
          aria-label={t("correctEventAria", { when: occurredAtLocalLabel })}
        >
          {t("correctEvent")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("correctDialogTitle")}</DialogTitle>
          <DialogDescription>{t("correctDialogDescription")}</DialogDescription>
        </DialogHeader>
        <AttendanceCorrectionForm
          originalEventId={originalEventId}
          occurredAtIso={occurredAtIso}
          eventType={eventType}
          onSuccess={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  )
}
