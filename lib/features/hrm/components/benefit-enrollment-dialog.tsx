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

import type { LeaveEmployeeChoiceRow } from "../data/leave-request.queries.server"

import { BenefitEnrollmentForm, type BenefitPlanChoiceRow } from "./benefit-enrollment-form"

type BenefitEnrollmentDialogProps = {
  employees: ReadonlyArray<LeaveEmployeeChoiceRow>
  plans: ReadonlyArray<BenefitPlanChoiceRow>
}

export function BenefitEnrollmentDialog({ employees, plans }: BenefitEnrollmentDialogProps) {
  const t = useTranslations("Dashboard.Hrm.benefits")
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" type="button">
          <PlusIcon data-icon="inline-start" aria-hidden />
          {t("enrollEmployee")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("enrollDialogTitle")}</DialogTitle>
          <DialogDescription>{t("enrollDialogDescription")}</DialogDescription>
        </DialogHeader>
        <BenefitEnrollmentForm
          employees={employees}
          plans={plans}
          onSuccess={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  )
}
