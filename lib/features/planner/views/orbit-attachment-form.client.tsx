"use client"

import { useActionState, useState } from "react"
import { upload as uploadBlob } from "@vercel/blob/client"
import { Loader2, Paperclip } from "lucide-react"

import { Button } from "#components/ui/button"

import { addPlannerAttachmentAction } from "../commands/add-planner-attachment"
import type { OrbitDashboardSurface, PlannerScopeInput } from "../types"

const ORBIT_UPLOAD_ACCEPT =
  "image/jpeg,image/png,image/webp,application/pdf" as const
const ORBIT_UPLOAD_MULTIPART_THRESHOLD_BYTES = 5 * 1024 * 1024

function sanitizeUploadFilename(name: string): string {
  const trimmed = name.trim()
  const replaced = trimmed.replace(/[^a-zA-Z0-9._-]+/g, "-")
  const collapsed = replaced.replace(/-+/g, "-").replace(/^-|-$/g, "")
  return collapsed.length > 0 ? collapsed : "file"
}

function buildOrbitUploadPath(
  scope: PlannerScopeInput,
  itemId: string,
  file: File
) {
  if (scope.scopeKind !== "organization") {
    throw new Error("Orbit attachments require organization scope")
  }
  const safeName = sanitizeUploadFilename(file.name)
  const prefix = `orgs/${scope.organizationId}/orbit/${itemId}`

  return `${prefix}/${Date.now()}-${safeName}`
}

async function sha256HexFromFile(file: File): Promise<string> {
  const buf = await file.arrayBuffer()
  const hash = await crypto.subtle.digest("SHA-256", buf)
  return Array.from(new Uint8Array(hash))
    .map((entry) => entry.toString(16).padStart(2, "0"))
    .join("")
}

export function OrbitAttachmentForm({
  scope,
  surface,
  orgSlug,
  itemId,
}: {
  scope: PlannerScopeInput
  surface: OrbitDashboardSurface
  orgSlug?: string
  itemId: string
}) {
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [payload, setPayload] = useState<{
    blobUrl: string
    payloadHash: string
    mimeType: string
    sizeBytes: number
  } | null>(null)

  const [, formAction, pending] = useActionState(
    async (_state: null, formData: FormData) => {
      await addPlannerAttachmentAction(formData)
      return null
    },
    null
  )

  async function onUploadFile(file: File | null) {
    setUploadError(null)
    setPayload(null)
    if (!file) return

    setUploading(true)
    try {
      const payloadHash = await sha256HexFromFile(file)
      const uploaded = await uploadBlob(
        buildOrbitUploadPath(scope, itemId, file),
        file,
        {
          access: "public",
          contentType: file.type || undefined,
          handleUploadUrl: "/api/upload/blob",
          multipart: file.size >= ORBIT_UPLOAD_MULTIPART_THRESHOLD_BYTES,
          clientPayload: JSON.stringify({
            source: "orbit-item-attachment",
            fileName: file.name,
            fileSize: file.size,
            mimeType: file.type || null,
            routePath:
              typeof window !== "undefined" ? window.location.pathname : null,
            linkedEntityType: "planner_item",
            linkedEntityId: itemId,
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
          : "Attachment upload failed."
      )
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-3 rounded-2xl border border-border/60 bg-muted/20 p-3">
      <div className="flex flex-wrap items-center gap-3">
        <Paperclip className="size-4 text-muted-foreground" aria-hidden />
        <label className="text-sm font-medium">
          <span className="mr-2">Choose attachment</span>
          <input
            type="file"
            accept={ORBIT_UPLOAD_ACCEPT}
            className="max-w-[220px] text-xs text-muted-foreground file:mr-2"
            disabled={uploading || pending}
            onChange={(event) => {
              const next = event.target.files?.[0] ?? null
              void onUploadFile(next)
            }}
          />
        </label>
        {uploading ? (
          <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
            Uploading
          </span>
        ) : null}
      </div>

      {uploadError ? (
        <p className="text-xs text-destructive" role="alert">
          {uploadError}
        </p>
      ) : null}

      <form action={formAction} className="flex flex-wrap items-center gap-3">
        <input type="hidden" name="scopeKind" value={scope.scopeKind} />
        <input type="hidden" name="surface" value={surface} />
        <input type="hidden" name="orgSlug" value={orgSlug ?? ""} />
        <input type="hidden" name="itemId" value={itemId} />
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

        <Button
          type="submit"
          size="sm"
          variant="outline"
          disabled={!payload || pending}
        >
          {pending ? "Attaching..." : "Attach file"}
        </Button>
        {payload ? (
          <span className="text-xs text-muted-foreground">Ready to attach</span>
        ) : null}
      </form>
    </div>
  )
}
