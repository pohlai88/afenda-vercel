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

import { BenefitPlanForm } from "./benefit-plan-form"

export function BenefitPlanCreateDialog() {
  const t = useTranslations("Dashboard.Hrm.benefits")
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" type="button">
          <PlusIcon data-icon="inline-start" aria-hidden />
          {t("createPlan")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("createPlanDialogTitle")}</DialogTitle>
          <DialogDescription>
            {t("createPlanDialogDescription")}
          </DialogDescription>
        </DialogHeader>
        <BenefitPlanForm mode="create" onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  )
}
