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

import type { BenefitPlanRow } from "../data/benefit-model.shared"

import { BenefitPlanForm } from "./benefit-plan-form"

type BenefitPlanEditDialogProps = {
  plan: BenefitPlanRow
}

export function BenefitPlanEditDialog({ plan }: BenefitPlanEditDialogProps) {
  const t = useTranslations("Dashboard.Hrm.benefits")
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" type="button" variant="outline">
          {t("editPlan")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("editPlanDialogTitle")}</DialogTitle>
          <DialogDescription>
            {t("editPlanDialogDescription")}
          </DialogDescription>
        </DialogHeader>
        <BenefitPlanForm
          mode="edit"
          plan={plan}
          onSuccess={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  )
}
