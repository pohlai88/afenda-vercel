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

import type {
  LeaveEmployeeChoiceRow,
  LeaveTypeChoiceRow,
} from "../data/leave-request.queries.server"

import { LeaveApplyForm } from "./leave-apply-form"

type LeaveApplyDialogProps = {
  orgSlug: string
  employees: LeaveEmployeeChoiceRow[]
  leaveTypes: LeaveTypeChoiceRow[]
}

/**
 * Trigger + Dialog wrapper for the apply-leave form. Owns only `open`;
 * the form body lives in {@link LeaveApplyForm} so the cross-component
 * `onSuccess` close is a normal callback (not a `setState` inside an
 * effect) — same shape as `AddEmployeeDialog`.
 */
export function LeaveApplyDialog({
  orgSlug,
  employees,
  leaveTypes,
}: LeaveApplyDialogProps) {
  const t = useTranslations("Dashboard.Hrm.leave")
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" type="button">
          <PlusIcon data-icon="inline-start" aria-hidden />
          {t("applyOnBehalf")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("applyDialogTitle")}</DialogTitle>
          <DialogDescription>{t("applyDialogDescription")}</DialogDescription>
        </DialogHeader>
        <LeaveApplyForm
          orgSlug={orgSlug}
          employees={employees}
          leaveTypes={leaveTypes}
          onSuccess={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  )
}
