"use client"

import { useActionState, useState } from "react"
import { useTranslations } from "next-intl"
import { upload as uploadBlob } from "@vercel/blob/client"
import { FileUp, Loader2 } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "#components2/ui/alert"
import { Button } from "#components2/ui/button"
import { Field, FieldLabel } from "#components2/ui/field"
import { Input } from "#components2/ui/input"

import { attachEmployeeDocumentAction } from "#features/hrm/client"

import {
  HRM_DOCUMENT_CLASSIFICATIONS,
  HRM_DOCUMENT_TYPES,
} from "../schemas/hrm-document.schema"
import { hrmDocumentTypeLabelKey } from "../data/hrm-document-display.shared"

const HRM_DOC_UPLOAD_ACCEPT =
  "image/jpeg,image/png,image/webp,application/pdf" as const
const HRM_DOC_MULTIPART_THRESHOLD_BYTES = 5 * 1024 * 1024

function sanitizeUploadFilename(name: string): string {
  const trimmed = name.trim()
  const replaced = trimmed.replace(/[^a-zA-Z0-9._-]+/g, "-")
  const collapsed = replaced.replace(/-+/g, "-").replace(/^-|-$/g, "")
  return collapsed.length > 0 ? collapsed : "file"
}

function buildHrmUploadPath(
  organizationId: string,
  employeeId: string,
  file: File
): string {
  const safeName = sanitizeUploadFilename(file.name)
  return `orgs/${organizationId}/hrm/${employeeId}/${Date.now()}-${safeName}`
}

async function sha256HexFromFile(file: File): Promise<string> {
  const buf = await file.arrayBuffer()
  const hash = await crypto.subtle.digest("SHA-256", buf)
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

type DraftContractOption = {
  id: string
  versionNumber: number
}

type HrmDocumentAttachFormProps = {
  orgSlug: string
  organizationId: string
  employeeId: string
  draftContracts: DraftContractOption[]
}

export function HrmDocumentAttachForm({
  orgSlug,
  organizationId,
  employeeId,
  draftContracts,
}: HrmDocumentAttachFormProps) {
  const t = useTranslations("Dashboard.Hrm.workforce")
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [payload, setPayload] = useState<{
    blobUrl: string
    payloadHash: string
    mimeType: string
    sizeBytes: number
  } | null>(null)

  const [state, formAction, pending] = useActionState(
    attachEmployeeDocumentAction,
    undefined
  )

  async function onUploadFile(file: File | null) {
    setUploadError(null)
    setPayload(null)
    if (!file) return

    setUploading(true)
    try {
      const payloadHash = await sha256HexFromFile(file)
      const uploaded = await uploadBlob(
        buildHrmUploadPath(organizationId, employeeId, file),
        file,
        {
          access: "public",
          contentType: file.type || undefined,
          handleUploadUrl: "/api/upload/blob",
          multipart: file.size >= HRM_DOC_MULTIPART_THRESHOLD_BYTES,
          clientPayload: JSON.stringify({
            source: "hrm-workforce-document",
            fileName: file.name,
            fileSize: file.size,
            mimeType: file.type || null,
            routePath:
              typeof window !== "undefined" ? window.location.pathname : null,
            hrmEmployeeId: employeeId,
          }),
          onUploadProgress() {},
        }
      )
      setPayload({
        blobUrl: uploaded.url,
        payloadHash,
        mimeType: file.type || "application/octet-stream",
        sizeBytes: file.size,
      })
    } catch (error) {
      setUploadError(
        error instanceof Error && error.message.trim().length > 0
          ? error.message
          : t("documentUploadFailed")
      )
    } finally {
      setUploading(false)
    }
  }

  function todayIsoDate(): string {
    const d = new Date()
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, "0")
    const day = String(d.getDate()).padStart(2, "0")
    return `${y}-${m}-${day}`
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-lg border border-dashed border-border bg-muted/15 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <FileUp className="size-4 text-muted-foreground" aria-hidden />
          <label className="text-sm font-medium">
            <span className="mr-2">{t("documentChooseFile")}</span>
            <input
              type="file"
              accept={HRM_DOC_UPLOAD_ACCEPT}
              className="max-w-[220px] text-xs text-muted-foreground file:mr-2"
              disabled={uploading}
              onChange={(event) => {
                const next = event.target.files?.[0] ?? null
                void onUploadFile(next)
              }}
            />
          </label>
          {uploading ? (
            <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
              {t("documentUploading")}
            </span>
          ) : null}
        </div>
        <p className="mt-2 text-[11px] leading-snug text-muted-foreground">
          {t("documentUploadHint")}
        </p>
        {uploadError ? (
          <p className="mt-2 text-xs text-destructive" role="alert">
            {uploadError}
          </p>
        ) : null}
      </div>

      <form action={formAction} className="flex flex-col gap-3">
        <input type="hidden" name="orgSlug" value={orgSlug} />
        <input type="hidden" name="employeeId" value={employeeId} />
        <input type="hidden" name="blobUrl" value={payload?.blobUrl ?? ""} />
        <input
          type="hidden"
          name="payloadHash"
          value={payload?.payloadHash ?? ""}
        />
        <input type="hidden" name="mimeType" value={payload?.mimeType ?? ""} />
        <input
          type="hidden"
          name="sizeBytes"
          value={payload?.sizeBytes ?? ""}
        />

        {state && !state.ok && state.errors.form ? (
          <Alert variant="destructive">
            <AlertTitle>{t("errorTitle")}</AlertTitle>
            <AlertDescription>{state.errors.form}</AlertDescription>
          </Alert>
        ) : null}

        <Field>
          <FieldLabel htmlFor="doc-title">{t("documentTitleLabel")}</FieldLabel>
          <Input id="doc-title" name="title" required disabled={!payload} />
        </Field>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="doc-type">{t("documentTypeLabel")}</FieldLabel>
            <select
              id="doc-type"
              name="documentType"
              required
              disabled={!payload}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
              defaultValue={HRM_DOCUMENT_TYPES[0]}
            >
              {HRM_DOCUMENT_TYPES.map((dt) => (
                <option key={dt} value={dt}>
                  {t(hrmDocumentTypeLabelKey(dt))}
                </option>
              ))}
            </select>
          </Field>
          <Field>
            <FieldLabel htmlFor="doc-class">
              {t("documentClassificationLabel")}
            </FieldLabel>
            <select
              id="doc-class"
              name="classification"
              required
              disabled={!payload}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
              defaultValue="internal"
            >
              {HRM_DOCUMENT_CLASSIFICATIONS.map((cl) => (
                <option key={cl} value={cl}>
                  {t(`documentClassifications.${cl}`)}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Field>
          <FieldLabel htmlFor="doc-effective">
            {t("documentEffectiveFrom")}
          </FieldLabel>
          <Input
            id="doc-effective"
            name="effectiveFrom"
            type="date"
            required
            disabled={!payload}
            defaultValue={todayIsoDate()}
          />
        </Field>

        {draftContracts.length > 0 ? (
          <Field>
            <FieldLabel htmlFor="doc-draft-contract">
              {t("documentLinkDraftLabel")}
            </FieldLabel>
            <select
              id="doc-draft-contract"
              name="draftContractId"
              disabled={!payload}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
              defaultValue=""
            >
              <option value="">{t("documentLinkDraftNone")}</option>
              {draftContracts.map((d) => (
                <option key={d.id} value={d.id}>
                  {t("documentLinkDraftOption", { version: d.versionNumber })}
                </option>
              ))}
            </select>
          </Field>
        ) : null}

        <Button type="submit" disabled={!payload || pending}>
          {pending ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
              {t("documentAttaching")}
            </>
          ) : (
            t("documentAttachSubmit")
          )}
        </Button>
      </form>
    </div>
  )
}
