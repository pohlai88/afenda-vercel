"use client"

import { useState, useTransition } from "react"
import { useTranslations } from "next-intl"

import { Button } from "#components2/ui/button"

import { exportComplianceDashboardCsvAction } from "../actions/compliance-report.actions"

function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

export function ComplianceDashboardExportActions() {
  const t = useTranslations("Dashboard.Hrm.compliance.reports")
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
        data-testid="hrm-compliance-export-dashboard"
        onClick={() => {
          setError(null)
          startTransition(async () => {
            const result = await exportComplianceDashboardCsvAction()
            if (!result.ok) {
              setError(result.error)
              return
            }
            downloadCsv(result.filename, result.csv)
          })
        }}
      >
        {pending ? t("exporting") : t("exportDashboard")}
      </Button>
    </div>
  )
}
