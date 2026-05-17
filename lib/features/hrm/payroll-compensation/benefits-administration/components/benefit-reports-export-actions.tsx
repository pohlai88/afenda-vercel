"use client"

import { useState, useTransition } from "react"
import { useTranslations } from "next-intl"

import { Button } from "#components/ui/button"

import {
  exportBenefitCensusCsvAction,
  exportBenefitDeductionReconciliationCsvAction,
} from "../actions/benefit-report.actions"

type BenefitReportsExportActionsProps = {
  periodStart: string
  periodEnd: string
}

function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

export function BenefitReportsExportActions({
  periodStart,
  periodEnd,
}: BenefitReportsExportActionsProps) {
  const t = useTranslations("Dashboard.Hrm.benefits")
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  return (
    <div className="flex flex-wrap items-center gap-2">
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() => {
          setError(null)
          startTransition(async () => {
            const result = await exportBenefitCensusCsvAction()
            if (!result.ok) {
              setError(result.error)
              return
            }
            downloadCsv(result.filename, result.csv)
          })
        }}
      >
        {t("reports.exportCensus")}
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() => {
          setError(null)
          startTransition(async () => {
            const result = await exportBenefitDeductionReconciliationCsvAction(
              periodStart,
              periodEnd
            )
            if (!result.ok) {
              setError(result.error)
              return
            }
            downloadCsv(result.filename, result.csv)
          })
        }}
      >
        {t("reports.exportDeductions")}
      </Button>
    </div>
  )
}
