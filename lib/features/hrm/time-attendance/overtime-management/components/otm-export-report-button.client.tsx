"use client"

import { useState, useTransition } from "react"
import { useTranslations } from "next-intl"
import { Loader2 } from "lucide-react"

import { Button } from "#components2/ui/button"

import { exportOtmOperationalReportCsvAction } from "#features/hrm/client"

export function OtmExportReportButton() {
  const t = useTranslations("Dashboard.Hrm.overtime")
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  return (
    <div className="flex flex-col gap-2">
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() => {
          setError(null)
          startTransition(async () => {
            const result = await exportOtmOperationalReportCsvAction()
            if (!result.ok) {
              setError(result.error)
              return
            }
            const blob = new Blob([result.csv], { type: "text/csv;charset=utf-8" })
            const url = URL.createObjectURL(blob)
            const anchor = document.createElement("a")
            anchor.href = url
            anchor.download = result.filename
            anchor.click()
            URL.revokeObjectURL(url)
          })
        }}
      >
        {pending ? (
          <>
            <Loader2
              className="size-4 animate-spin"
              data-icon="inline-start"
              aria-hidden
            />
            {t("exportReportSubmitting")}
          </>
        ) : (
          t("exportReport")
        )}
      </Button>
      {error ? <span className="text-xs text-destructive">{error}</span> : null}
    </div>
  )
}
