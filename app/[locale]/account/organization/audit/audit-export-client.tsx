"use client"

import Link from "next/link"
import { useState } from "react"

import { exportOrganizationIamAuditCsvAction } from "./audit-export-actions"
import { Alert, AlertDescription, AlertTitle } from "#components/ui/alert"
import { Button } from "#components/ui/button"
import { Spinner } from "#components/ui/spinner"

function triggerCsvDownload(csv: string, filename: string): void {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.rel = "noopener"
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export function OrganizationAuditCsvExport() {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onExport() {
    setError(null)
    setPending(true)
    try {
      const result = await exportOrganizationIamAuditCsvAction()
      if (!result) return
      if (result.ok === true) {
        triggerCsvDownload(result.csv, result.filename)
      } else {
        setError(result.error)
      }
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={onExport}
        >
          {pending ? (
            <span className="inline-flex items-center gap-2">
              <Spinner className="size-3.5" />
              Exporting…
            </span>
          ) : (
            "Download CSV"
          )}
        </Button>
        <Button asChild variant="outline" size="sm">
          {/* `next/link`: `/api/*` must stay non–locale-prefixed; do not use `#i18n/navigation` here. */}
          <Link
            href="/api/integrations/organization-audit-csv"
            prefetch={false}
          >
            Stream export (50k)
          </Link>
        </Button>
        <span className="text-xs text-muted-foreground">
          UTF-8 CSV, newest first. Quick export up to 10k rows; streamed export
          up to 50k with optional HMAC footer when{" "}
          <code className="text-[10px]">ORG_AUDIT_EXPORT_HMAC_SECRET</code> or{" "}
          <code className="text-[10px]">BETTER_AUTH_SECRET</code> is set.
        </span>
      </div>
      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Export failed</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  )
}
