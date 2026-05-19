"use client"

import { useState, useTransition } from "react"
import { useTranslations } from "next-intl"
import { Download, Loader2 } from "lucide-react"

import { Button } from "#components2/ui/button"

type LamExportKind = "leave" | "attendance"

type LamExportReportButtonProps = {
  kind: LamExportKind
  exportAction: () => Promise<
    { ok: true; csv: string; filename: string } | { ok: false; error: string }
  >
}

export function LamExportReportButton({
  kind,
  exportAction,
}: LamExportReportButtonProps) {
  const t = useTranslations("Dashboard.Hrm.leave")
  const tAttendance = useTranslations("Dashboard.Hrm.attendance")
  const copy = kind === "leave" ? t : tAttendance
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() => {
          setError(null)
          startTransition(async () => {
            const result = await exportAction()
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
            {copy("exportingReport")}
          </>
        ) : (
          <>
            <Download className="size-4" data-icon="inline-start" aria-hidden />
            {copy("exportReport")}
          </>
        )}
      </Button>
      {error ? (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
