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

import type { ClaimTypeRow } from "../data/claim.queries.server"
import type { LeaveEmployeeChoiceRow } from "../data/leave-request.queries.server"

import { ClaimSubmitForm } from "./claim-submit-form"

type ClaimSubmitDialogProps = {
  mode: "own" | "on_behalf"
  employees?: ReadonlyArray<LeaveEmployeeChoiceRow>
  claimTypes: ReadonlyArray<ClaimTypeRow>
}

/**
 * Trigger + Dialog wrapper for the submit-claim form. Owns only `open`;
 * the body lives in {@link ClaimSubmitForm} so the dialog-close callback
 * reads as a normal cross-component callback.
 */
export function ClaimSubmitDialog({
  mode,
  employees,
  claimTypes,
}: ClaimSubmitDialogProps) {
  const t = useTranslations("Dashboard.Hrm.claims")
  const [open, setOpen] = useState(false)
  const isOwn = mode === "own"

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" type="button">
          <PlusIcon data-icon="inline-start" aria-hidden />
          {isOwn ? t("submitOwnClaim") : t("submitClaim")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isOwn ? t("submitOwnDialogTitle") : t("submitDialogTitle")}
          </DialogTitle>
          <DialogDescription>
            {isOwn
              ? t("submitOwnDialogDescription")
              : t("submitDialogDescription")}
          </DialogDescription>
        </DialogHeader>
        <ClaimSubmitForm
          mode={mode}
          employees={employees ?? []}
          claimTypes={claimTypes}
          onSuccess={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  )
}
