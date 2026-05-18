"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { PlusIcon } from "lucide-react"

import { Button } from "#components2/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "#components2/ui/dialog"

import type {
  ClaimSubmitClaimTypeOption,
  ClaimSubmitEmployeeOption,
  ClaimSubmitExpenseFundOption,
} from "../data/claim-form-options.shared"

import { ClaimSubmitForm } from "./claim-submit-form"

type ClaimSubmitDialogProps = {
  mode: "own" | "on_behalf"
  employees?: ReadonlyArray<ClaimSubmitEmployeeOption>
  claimTypes: ReadonlyArray<ClaimSubmitClaimTypeOption>
  expenseFunds?: ReadonlyArray<ClaimSubmitExpenseFundOption>
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
  expenseFunds = [],
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
          expenseFunds={expenseFunds}
          onSuccess={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  )
}
