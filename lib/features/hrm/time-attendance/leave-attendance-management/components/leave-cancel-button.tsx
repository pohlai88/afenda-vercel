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

import { LeaveCancelForm } from "./leave-cancel-form"

type LeaveCancelButtonProps = {
  requestId: string
}

/**
 * Cancel a submitted/approved leave request ÔÇö admin-only action.
 *
 * Wrapped in a confirmation dialog because cancellation is observable
 * to the requester (the leave row flips state + recomputes the
 * balance). The Server Action enforces admin gating; the dialog is a
 * UX safety net, not a security boundary.
 */
export function LeaveCancelButton({ requestId }: LeaveCancelButtonProps) {
  const t = useTranslations("Dashboard.Hrm.leave")
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost" type="button">
          {t("cancelRequest")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("cancelRequest")}</DialogTitle>
          <DialogDescription>
            {t("cancelAria", { dates: requestId })}
          </DialogDescription>
        </DialogHeader>
        <LeaveCancelForm
          requestId={requestId}
          onSuccess={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  )
}
