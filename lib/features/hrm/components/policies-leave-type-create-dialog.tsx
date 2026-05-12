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

import { LeaveTypeForm } from "./policies-leave-type-form"

/**
 * Trigger + dialog wrapper for the create-leave-type form. Owns only
 * `open`; the form body lives in {@link LeaveTypeForm} so the
 * cross-component `onSuccess` close reads as a normal callback (mirrors
 * `LeaveApplyDialog` / `AttendanceRecordEventDialog`).
 */
export function LeaveTypeCreateDialog() {
  const t = useTranslations("Dashboard.Hrm.policies")
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" type="button">
          <PlusIcon data-icon="inline-start" aria-hidden />
          {t("leaveTypes.create")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("leaveTypes.createDialogTitle")}</DialogTitle>
          <DialogDescription>
            {t("leaveTypes.createDialogDescription")}
          </DialogDescription>
        </DialogHeader>
        <LeaveTypeForm onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  )
}
