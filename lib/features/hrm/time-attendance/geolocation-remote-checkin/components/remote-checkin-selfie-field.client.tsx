"use client"

import { useId, useState } from "react"
import { useTranslations } from "next-intl"
import { upload as uploadBlob } from "@vercel/blob/client"
import { Camera, Loader2 } from "lucide-react"

import { Alert, AlertDescription } from "#components2/ui/alert"
import { Field, FieldDescription, FieldError, FieldLabel } from "#components2/ui/field"
import { Input } from "#components2/ui/input"

const SELFIE_ACCEPT = "image/jpeg,image/png,image/webp" as const

function sanitizeUploadFilename(name: string): string {
  const trimmed = name.trim()
  const replaced = trimmed.replace(/[^a-zA-Z0-9._-]+/g, "-")
  const collapsed = replaced.replace(/-+/g, "-").replace(/^-|-$/g, "")
  return collapsed.length > 0 ? collapsed : "selfie"
}

function buildRemoteCheckinSelfieUploadPath(
  organizationId: string,
  employeeId: string,
  file: File
): string {
  const safeName = sanitizeUploadFilename(file.name)
  return `orgs/${organizationId}/hrm/${employeeId}/remote-checkin-selfie/${Date.now()}-${safeName}`
}

type RemoteCheckinSelfieFieldProps = {
  readonly organizationId: string
  readonly employeeId: string
  readonly required?: boolean
  readonly fieldError?: string
}

export function RemoteCheckinSelfieField({
  organizationId,
  employeeId,
  required = false,
  fieldError,
}: RemoteCheckinSelfieFieldProps) {
  const t = useTranslations("Dashboard.Hrm.Geolocation.capture")
  const inputId = useId()
  const [selfieBlobUrl, setSelfieBlobUrl] = useState("")
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  async function onFileChange(file: File | null) {
    setUploadError(null)
    setSelfieBlobUrl("")
    if (!file) return

    setUploading(true)
    try {
      const uploaded = await uploadBlob(
        buildRemoteCheckinSelfieUploadPath(organizationId, employeeId, file),
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
      setSelfieBlobUrl(uploaded.url)
    } catch (error) {
      setUploadError(
        error instanceof Error && error.message.trim().length > 0
          ? error.message
          : t("selfieUploadFailed")
      )
    } finally {
      setUploading(false)
    }
  }

  return (
    <Field>
      <FieldLabel htmlFor={inputId}>
        {t("fieldSelfie")}
        {required ? (
          <>
            <span aria-hidden="true"> *</span>
            <span className="sr-only"> (required)</span>
          </>
        ) : null}
      </FieldLabel>
      <FieldDescription>{t("fieldSelfieHint")}</FieldDescription>
      <input type="hidden" name="selfieBlobUrl" value={selfieBlobUrl} />
      <div className="flex flex-col gap-2">
        <Input
          id={inputId}
          type="file"
          accept={SELFIE_ACCEPT}
          disabled={uploading}
          aria-required={required}
          aria-invalid={Boolean(fieldError || uploadError)}
          onChange={(event) => {
            const file = event.target.files?.[0] ?? null
            void onFileChange(file)
          }}
        />
        {uploading ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" aria-hidden />
            {t("selfieUploading")}
          </p>
        ) : null}
        {selfieBlobUrl ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Camera className="size-4" aria-hidden />
            {t("selfieAttached")}
          </p>
        ) : null}
        {uploadError ? (
          <Alert variant="destructive">
            <AlertDescription>{uploadError}</AlertDescription>
          </Alert>
        ) : null}
        {fieldError ? <FieldError>{fieldError}</FieldError> : null}
      </div>
    </Field>
  )
}
