"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { upload as uploadBlob } from "@vercel/blob/client"
import { FileUp, Loader2 } from "lucide-react"

import { Field, FieldError, FieldLabel } from "#components2/ui/field"
import { Input } from "#components2/ui/input"
import { Button } from "#components2/ui/button"

import { registerFwaEvidenceDocumentAction } from "#features/hrm/client"

const FWA_EVIDENCE_ACCEPT =
  "image/jpeg,image/png,image/webp,application/pdf" as const

function sanitizeUploadFilename(name: string): string {
  const trimmed = name.trim()
  const replaced = trimmed.replace(/[^a-zA-Z0-9._-]+/g, "-")
  const collapsed = replaced.replace(/-+/g, "-").replace(/^-|-$/g, "")
  return collapsed.length > 0 ? collapsed : "file"
}

function buildFwaEvidenceUploadPath(
  organizationId: string,
  employeeId: string,
  file: File
): string {
  const safeName = sanitizeUploadFilename(file.name)
  return `orgs/${organizationId}/hrm/${employeeId}/fwa-evidence/${Date.now()}-${safeName}`
}

async function sha256HexFromFile(file: File): Promise<string> {
  const buf = await file.arrayBuffer()
  const hash = await crypto.subtle.digest("SHA-256", buf)
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

type FwaEvidenceUploadFieldProps = {
  organizationId: string
  employeeId: string | null
  documentId: string
  onDocumentIdChange: (documentId: string) => void
  disabled?: boolean
}

export function FwaEvidenceUploadField({
  organizationId,
  employeeId,
  documentId,
  onDocumentIdChange,
  disabled,
}: FwaEvidenceUploadFieldProps) {
  const t = useTranslations("Dashboard.Hrm.flexibleWork")
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  async function onFileChange(file: File | null) {
    setUploadError(null)
    onDocumentIdChange("")
    if (!file || !employeeId) {
      if (file && !employeeId) {
        setUploadError(t("evidenceEmployeeRequired"))
      }
      return
    }

    setUploading(true)
    try {
      const payloadHash = await sha256HexFromFile(file)
      const uploaded = await uploadBlob(
        buildFwaEvidenceUploadPath(organizationId, employeeId, file),
        file,
        {
          access: "public",
          contentType: file.type || undefined,
          handleUploadUrl: "/api/upload/blob",
          clientPayload: JSON.stringify({
            source: "hrm-workforce-document",
            fileName: file.name,
            hrmEmployeeId: employeeId,
          }),
        }
      )

      const formData = new FormData()
      formData.set("employeeId", employeeId)
      formData.set("blobUrl", uploaded.url)
      formData.set("payloadHash", payloadHash)
      formData.set("mimeType", file.type || "application/octet-stream")
      formData.set("sizeBytes", String(file.size))
      formData.set("title", file.name)

      const result = await registerFwaEvidenceDocumentAction(
        undefined,
        formData
      )
      if (!result.ok) {
        setUploadError(result.errors.form ?? t("evidenceUploadFailed"))
        return
      }
      onDocumentIdChange(result.documentId)
    } catch (error) {
      setUploadError(
        error instanceof Error && error.message.trim().length > 0
          ? error.message
          : t("evidenceUploadFailed")
      )
    } finally {
      setUploading(false)
    }
  }

  return (
    <Field>
      <FieldLabel htmlFor="fwa-evidence-file">
        {t("fieldEvidenceFile")}
      </FieldLabel>
      <div className="flex flex-col gap-2">
        <Input
          id="fwa-evidence-file"
          type="file"
          accept={FWA_EVIDENCE_ACCEPT}
          disabled={disabled || uploading || !employeeId}
          onChange={(event) => {
            const file = event.target.files?.[0] ?? null
            void onFileChange(file)
          }}
        />
        {uploading ? (
          <Button type="button" variant="outline" size="sm" disabled>
            <Loader2
              className="size-4 animate-spin"
              data-icon="inline-start"
              aria-hidden
            />
            {t("evidenceUploading")}
          </Button>
        ) : documentId ? (
          <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <FileUp className="size-4" aria-hidden />
            {t("evidenceAttached")}
          </span>
        ) : null}
      </div>
      <input type="hidden" name="evidenceDocumentId" value={documentId} />
      {uploadError ? <FieldError>{uploadError}</FieldError> : null}
    </Field>
  )
}
