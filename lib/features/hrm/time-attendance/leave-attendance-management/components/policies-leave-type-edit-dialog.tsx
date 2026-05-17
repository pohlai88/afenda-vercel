"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"

import { Button } from "#components2/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "#components2/ui/dialog"

import type { LeaveTypeAdminRow } from "../data/leave-policy.queries.server"

import { LeaveTypeForm } from "./policies-leave-type-form"

type LeaveTypeEditDialogProps = {
  row: LeaveTypeAdminRow
}

/**
 * Per-row edit dialog. The trigger renders inside the leave-types
 * table cell; the form body re-uses {@link LeaveTypeForm} in edit
 * mode (the row prop drives prefill + drives the action toward
 * `updateLeaveTypeAction`).
 */
export function LeaveTypeEditDialog({ row }: LeaveTypeEditDialogProps) {
  const t = useTranslations("Dashboard.Hrm.policies")
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" type="button" variant="outline">
          {t("leaveTypes.edit")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("leaveTypes.editDialogTitle")}</DialogTitle>
          <DialogDescription>
            {t("leaveTypes.editDialogDescription")}
          </DialogDescription>
        </DialogHeader>
        <LeaveTypeForm row={row} onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  )
}
