"use client"

import { useState, useTransition } from "react"
import { useTranslations } from "next-intl"
import { Loader2 } from "lucide-react"

import { Button } from "#components2/ui/button"

import { exportShiftRosterCsvAction } from "#features/hrm/client"

type SftExportReportButtonProps = {
  rangeStart: string
  rangeEnd: string
}

export function SftExportReportButton({
  rangeStart,
  rangeEnd,
}: SftExportReportButtonProps) {
  const t = useTranslations("Dashboard.Hrm.shiftScheduling")
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
            const formData = new FormData()
            formData.set("rangeStart", rangeStart)
            formData.set("rangeEnd", rangeEnd)
            const result = await exportShiftRosterCsvAction(formData)
            if (!result.ok) {
              setError(result.error)
              return
            }
            const blob = new Blob([result.csv], {
              type: "text/csv;charset=utf-8",
            })
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
