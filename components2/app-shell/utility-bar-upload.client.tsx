"use client"

import { useId, useRef, useState } from "react"
import { CheckCircle2, FileUp, Loader2, Upload } from "lucide-react"
import { upload as uploadBlob } from "@vercel/blob/client"

import { cn } from "#lib/utils"
import { uiRadius, uiSurfaceElevation } from "#lib/design-system"

import { Button } from "../ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu"
import { Progress } from "../ui/progress"
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip"
import { APP_SHELL_UTILITY_L2_ICON_CLASS } from "./utility-bar.client"

// ---------------------------------------------------------------------------
// Constants (aligned with app/api/upload/blob/route.ts)
// ---------------------------------------------------------------------------

const NEXUS_UTILITY_UPLOAD_ACCEPT =
  "image/jpeg,image/png,image/webp,application/pdf" as const
const NEXUS_UTILITY_UPLOAD_MAX_BYTES = 50 * 1024 * 1024
const NEXUS_UTILITY_UPLOAD_MULTIPART_THRESHOLD_BYTES = 5 * 1024 * 1024

const ORG_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

type BlobUploadResult = Awaited<ReturnType<typeof uploadBlob>>

type UploadPhase =
  | { kind: "idle" }
  | { kind: "selected"; file: File }
  | { kind: "uploading"; file: File; progress: number }
  | { kind: "done"; result: BlobUploadResult }
  | { kind: "error"; message: string }

export type UtilityBarUploadPanelProps = {
  /**
   * Neon / session organization id (UUID). Required for `/api/upload/blob`
   * token generation — path must be `orgs/{organizationId}/nexus-utility/…`.
   */
  organizationId?: string | null
}

function sanitizeUploadFilename(name: string): string {
  const trimmed = name.trim()
  const replaced = trimmed.replace(/[^a-zA-Z0-9._-]+/g, "-")
  const collapsed = replaced.replace(/-+/g, "-").replace(/^-|-$/g, "")
  return collapsed.length > 0 ? collapsed : "file"
}

function buildUploadPath(orgId: string, file: File): string {
  const safeName = sanitizeUploadFilename(file.name)
  return `orgs/${orgId}/nexus-utility/${Date.now()}-${safeName}`
}

function formatFileSize(size: number): string {
  if (!Number.isFinite(size) || size <= 0) return "0 B"
  const units = ["B", "KB", "MB", "GB"] as const
  let value = size
  let unitIndex = 0
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex += 1
  }
  const digits = value >= 10 || unitIndex === 0 ? 0 : 1
  return `${value.toFixed(digits)} ${units[unitIndex]}`
}

const ALLOWED_UPLOAD_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
] as const

function isAllowedFile(file: File): boolean {
  const type = file.type || ""
  if (
    !ALLOWED_UPLOAD_TYPES.includes(
      type as (typeof ALLOWED_UPLOAD_TYPES)[number]
    )
  ) {
    return false
  }
  if (file.size > NEXUS_UTILITY_UPLOAD_MAX_BYTES) return false
  return true
}

/** Right-rail governed file upload — DropdownMenu + Vercel Blob client upload. */
export function UtilityBarUploadPanel({
  organizationId = null,
}: UtilityBarUploadPanelProps) {
  const inputId = useId()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [open, setOpen] = useState(false)
  const [phase, setPhase] = useState<UploadPhase>({ kind: "idle" })

  const orgIdValid =
    typeof organizationId === "string" && ORG_ID_RE.test(organizationId)

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next) {
      setPhase({ kind: "idle" })
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  function pickFiles(files: FileList | null) {
    const file = files?.[0]
    if (!file) return
    if (!isAllowedFile(file)) {
      setPhase({
        kind: "error",
        message:
          "Use JPEG, PNG, WebP, or PDF up to 50 MB. Check the file type and size.",
      })
      return
    }
    setPhase({ kind: "selected", file })
  }

  async function runUpload(file: File) {
    if (!orgIdValid || !organizationId) {
      setPhase({
        kind: "error",
        message:
          "Open an organization workspace to upload — a signed-in org session is required.",
      })
      return
    }

    setPhase({ kind: "uploading", file, progress: 0 })
    try {
      const uploaded = await uploadBlob(
        buildUploadPath(organizationId, file),
        file,
        {
          access: "public",
          contentType: file.type || undefined,
          handleUploadUrl: "/api/upload/blob",
          multipart:
            file.size >= NEXUS_UTILITY_UPLOAD_MULTIPART_THRESHOLD_BYTES,
          clientPayload: JSON.stringify({
            source: "nexus-utility-right-rail",
            evidenceKind: "file",
            fileName: file.name,
            fileSize: file.size,
            mimeType: file.type || null,
            routePath:
              typeof window !== "undefined" ? window.location.pathname : null,
          }),
          onUploadProgress(event) {
            setPhase((p) =>
              p.kind === "uploading"
                ? {
                    ...p,
                    progress: Math.max(0, Math.min(100, event.percentage)),
                  }
                : p
            )
          },
        }
      )
      setPhase({ kind: "done", result: uploaded })
      if (fileInputRef.current) fileInputRef.current.value = ""
    } catch (error) {
      const raw =
        error instanceof Error && error.message.trim().length > 0
          ? error.message
          : "Upload failed"
      const message = /401|unauthorized/i.test(raw)
        ? "Not authorized — open an organization workspace and try again."
        : raw
      setPhase({ kind: "error", message })
    }
  }

  async function copyUrl(url: string) {
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      // ignore
    }
  }

  return (
    <DropdownMenu open={open} onOpenChange={handleOpenChange}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="File upload"
              className={cn(
                APP_SHELL_UTILITY_L2_ICON_CLASS,
                "data-[state=open]:bg-muted/55 data-[state=open]:text-foreground"
              )}
            >
              <span
                aria-hidden
                className="size-[15px] shrink-0 [&>svg]:size-full"
              >
                <FileUp strokeWidth={2} />
              </span>
            </button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom" align="center" sideOffset={8}>
          File upload
        </TooltipContent>
      </Tooltip>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        onCloseAutoFocus={(e) => e.preventDefault()}
        onInteractOutside={(e) => {
          const target = e.target as Element
          if (target?.closest("[data-radix-dropdown-menu-content]")) {
            e.preventDefault()
          }
        }}
        className={cn(
          "w-80 p-0",
          "border border-border bg-card/95 text-card-foreground backdrop-blur-sm",
          uiRadius.popover,
          uiSurfaceElevation.raised,
          "ring-0 ring-offset-0"
        )}
      >
        <div className="shrink-0 border-b border-border/50 px-4 py-3">
          <p className="text-xs font-semibold tracking-tight text-card-foreground">
            File upload
          </p>
          <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
            JPEG, PNG, WebP, or PDF — up to 50 MB. One file per upload.
          </p>
        </div>

        <div className="space-y-3 px-4 py-4">
          {!orgIdValid ? (
            <p className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-950 dark:text-amber-100">
              Uploads require an active organization workspace (tenant id is not
              available on this surface).
            </p>
          ) : null}

          {(phase.kind === "idle" || phase.kind === "error") && (
            <>
              <label htmlFor={inputId} className="block cursor-pointer">
                <div
                  className={cn(
                    "flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border/70 bg-muted/15 px-3 py-8 text-center transition-colors",
                    "hover:border-primary/40 hover:bg-muted/25"
                  )}
                  onDragOver={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                  }}
                  onDrop={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    pickFiles(e.dataTransfer.files)
                  }}
                >
                  <Upload
                    className="size-6 text-muted-foreground"
                    strokeWidth={1.5}
                    aria-hidden
                  />
                  <span className="text-[11px] font-medium text-foreground">
                    Drop a file here or tap to browse
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {NEXUS_UTILITY_UPLOAD_ACCEPT.replace(/,/g, ", ")}
                  </span>
                </div>
                <input
                  id={inputId}
                  ref={fileInputRef}
                  type="file"
                  accept={NEXUS_UTILITY_UPLOAD_ACCEPT}
                  className="sr-only"
                  onChange={(e) => pickFiles(e.target.files)}
                />
              </label>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="w-full"
                onClick={() => fileInputRef.current?.click()}
              >
                Choose file
              </Button>
              {phase.kind === "error" ? (
                <p className="text-[11px] text-destructive">{phase.message}</p>
              ) : null}
            </>
          )}

          {phase.kind === "selected" && (
            <div className="space-y-3">
              <div className="rounded-md border border-border/60 bg-card/50 px-3 py-2.5">
                <p className="truncate text-[11px] font-medium text-foreground">
                  {phase.file.name}
                </p>
                <p className="mt-0.5 text-[10px] text-muted-foreground tabular-nums">
                  {formatFileSize(phase.file.size)} ·{" "}
                  {phase.file.type || "unknown type"}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  className="flex-1"
                  disabled={!orgIdValid}
                  onClick={() => void runUpload(phase.file)}
                >
                  Upload
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setPhase({ kind: "idle" })
                    if (fileInputRef.current) fileInputRef.current.value = ""
                  }}
                >
                  Clear
                </Button>
              </div>
            </div>
          )}

          {phase.kind === "uploading" && (
            <div className="space-y-2" aria-busy="true">
              <div className="flex items-center gap-2">
                <Loader2
                  className="size-4 shrink-0 animate-spin text-primary"
                  strokeWidth={2}
                  aria-hidden
                />
                <p className="min-w-0 flex-1 truncate text-[11px] text-foreground">
                  {phase.file.name}
                </p>
              </div>
              <Progress value={phase.progress} />
              <p className="text-center text-[10px] text-muted-foreground tabular-nums">
                {phase.progress}%
              </p>
            </div>
          )}

          {phase.kind === "done" && (
            <div className="space-y-3">
              <div className="flex flex-col items-center gap-2 py-2 text-center">
                <div className="flex size-9 items-center justify-center rounded-full bg-primary/10">
                  <CheckCircle2
                    className="size-4 text-primary"
                    strokeWidth={2}
                    aria-hidden
                  />
                </div>
                <p className="text-sm font-medium text-foreground">
                  Upload complete
                </p>
                <button
                  type="button"
                  onClick={() => void copyUrl(phase.result.url)}
                  className="max-w-full truncate text-[11px] text-primary underline-offset-2 hover:underline"
                >
                  {phase.result.url}
                </button>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="w-full"
                onClick={() => {
                  setPhase({ kind: "idle" })
                  if (fileInputRef.current) fileInputRef.current.value = ""
                }}
              >
                Upload another
              </Button>
            </div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
