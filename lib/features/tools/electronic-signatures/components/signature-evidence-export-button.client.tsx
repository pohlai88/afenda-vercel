"use client"

import { useState, useTransition } from "react"
import { useTranslations } from "next-intl"

import { Button } from "#components2/ui/button"

import { exportSignatureEvidenceAction } from "../actions/signature-evidence-export.actions"

type SignatureEvidenceExportButtonProps = {
  orgSlug: string
  requestId: string
  disabled?: boolean
}

export function SignatureEvidenceExportButton({
  orgSlug,
  requestId,
  disabled,
}: SignatureEvidenceExportButtonProps) {
  const t = useTranslations("Dashboard.Hrm.signatures")
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  return (
    <div className="flex flex-col gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled || pending}
        onClick={() => {
          setError(null)
          startTransition(async () => {
            const result = await exportSignatureEvidenceAction({
              orgSlug,
              requestId,
            })
            if (!result.ok) {
              setError(result.error)
              return
            }
            const blob = new Blob([result.json], {
              type: "application/json",
            })
            const url = URL.createObjectURL(blob)
            const anchor = document.createElement("a")
            anchor.href = url
            anchor.download = `signature-evidence-${requestId}.json`
            anchor.click()
            URL.revokeObjectURL(url)
          })
        }}
      >
        {t("exportEvidenceAction")}
      </Button>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  )
}
