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

import {
  BenefitClaimReferenceForm,
  type BenefitEnrollmentChoice,
  type BenefitProviderChoice,
} from "./benefit-claim-reference-form"

type BenefitClaimReferenceCreateDialogProps = {
  enrollments: readonly BenefitEnrollmentChoice[]
  providers: readonly BenefitProviderChoice[]
}

export function BenefitClaimReferenceCreateDialog({
  enrollments,
  providers,
}: BenefitClaimReferenceCreateDialogProps) {
  const t = useTranslations("Dashboard.Hrm.benefits")
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          type="button"
          disabled={enrollments.length === 0}
        >
          <PlusIcon data-icon="inline-start" aria-hidden />
          {t("createClaimReference")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("createClaimReferenceDialogTitle")}</DialogTitle>
          <DialogDescription>
            {t("createClaimReferenceDialogDescription")}
          </DialogDescription>
        </DialogHeader>
        <BenefitClaimReferenceForm
          enrollments={enrollments}
          providers={providers}
          onSuccess={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  )
}
