"use client"

import { useId, useRef, useState } from "react"
import { CheckCircle2, FileUp, Upload } from "lucide-react"
import { upload as uploadBlob } from "@vercel/blob/client"
import { useTranslations } from "next-intl"

import { Button } from "#components/ui/button"
import { Progress } from "#components/ui/progress"
import { Popover, PopoverContent, PopoverTrigger } from "#components/ui/popover"
import { Spinner } from "#components/ui/spinner"
import { cn } from "#lib/utils"

import { WORKBENCH_UTILITY_ROUND_CONTROL_CLASS } from "./workbench-utility-round-control-class"
import { WorkbenchUtilityTriggerTooltip } from "./workbench-utility-trigger-tooltip"

const NEXUS_UTILITY_UPLOAD_ACCEPT =
  "image/jpeg,image/png,image/webp,application/pdf"
const NEXUS_UTILITY_UPLOAD_MULTIPART_THRESHOLD_BYTES = 5 * 1024 * 1024

type BlobUploadResult = Awaited<ReturnType<typeof uploadBlob>>

type NexusUtilityUploadProps = {
  orgId: string
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

/**
 * Quick tenant-scoped upload launcher for governed Blob intake from the Nexus utility bar.
 * v1 intentionally supports one file at a time and returns inline success or failure only.
 */
export function WorkbenchUtilityUpload({ orgId }: NexusUtilityUploadProps) {
  const t = useTranslations("Dashboard.shell.utilityBar.upload")
  const inputId = useId()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [result, setResult] = useState<BlobUploadResult | null>(null)

  async function handleUpload() {
    if (!selectedFile) {
      setErrorMessage(t("errorNoFile"))
      return
    }

    setUploading(true)
    setProgress(0)
    setErrorMessage(null)
    setResult(null)

    try {
      const uploaded = await uploadBlob(
        buildUploadPath(orgId, selectedFile),
        selectedFile,
        {
          access: "public",
          contentType: selectedFile.type || undefined,
          handleUploadUrl: "/api/upload/blob",
          multipart:
            selectedFile.size >= NEXUS_UTILITY_UPLOAD_MULTIPART_THRESHOLD_BYTES,
          clientPayload: JSON.stringify({
            source: "nexus-utility-right-rail",
            fileName: selectedFile.name,
            fileSize: selectedFile.size,
            mimeType: selectedFile.type || null,
            routePath:
              typeof window !== "undefined" ? window.location.pathname : null,
          }),
          onUploadProgress(event) {
            setProgress(Math.max(0, Math.min(100, event.percentage)))
          },
        }
      )
      setResult(uploaded)
      setSelectedFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ""
    } catch (error) {
      setErrorMessage(
        error instanceof Error && error.message.trim().length > 0
          ? error.message
          : t("errorGeneric")
      )
    } finally {
      setUploading(false)
    }
  }

  function resetForAnotherUpload() {
    setSelectedFile(null)
    setResult(null)
    setErrorMessage(null)
    setProgress(0)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  return (
    <Popover>
      <WorkbenchUtilityTriggerTooltip tooltip={t("tooltip")} align="end">
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={t("trigger")}
            className={cn(WORKBENCH_UTILITY_ROUND_CONTROL_CLASS)}
          >
            <Upload
              className="size-[15px] shrink-0"
              aria-hidden
              strokeWidth={2}
            />
          </button>
        </PopoverTrigger>
      </WorkbenchUtilityTriggerTooltip>

      <PopoverContent
        side="bottom"
        align="end"
        sideOffset={10}
        className="af-nexus-popover-panel w-80 bg-background/92 p-0"
      >
        <div className="border-b border-border/50 px-4 py-3">
          <p className="text-xs font-medium text-foreground">{t("title")}</p>
          <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
            {t("description")}
          </p>
        </div>

        <div className="flex flex-col gap-3 p-4">
          <div className="rounded-2xl border border-dashed border-border/60 bg-muted/25 p-3">
            <label htmlFor={inputId} className="sr-only">
              {t("fileInputLabel")}
            </label>
            <input
              id={inputId}
              ref={fileInputRef}
              type="file"
              accept={NEXUS_UTILITY_UPLOAD_ACCEPT}
              className="sr-only"
              onChange={(event) => {
                const nextFile = event.target.files?.[0] ?? null
                setSelectedFile(nextFile)
                setErrorMessage(null)
                setResult(null)
                setProgress(0)
              }}
            />
            <div className="flex flex-col gap-3">
              <div className="flex items-start gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full border border-border/60 bg-background/80">
                  <FileUp
                    className="size-4 text-muted-foreground"
                    aria-hidden
                    strokeWidth={2}
                  />
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <p className="text-sm font-medium text-foreground">
                    {selectedFile ? selectedFile.name : t("emptyState")}
                  </p>
                  <p className="text-[11px] leading-snug text-muted-foreground">
                    {selectedFile
                      ? t("selectedMeta", {
                          size: formatFileSize(selectedFile.size),
                        })
                      : t("acceptedTypes")}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {selectedFile ? t("replaceFile") : t("chooseFile")}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleUpload}
                  disabled={uploading || !selectedFile}
                >
                  {uploading ? (
                    <>
                      <Spinner aria-hidden />
                      {t("uploading")}
                    </>
                  ) : (
                    t("submit")
                  )}
                </Button>
              </div>
            </div>
          </div>

          {uploading ? (
            <div className="flex flex-col gap-2">
              <Progress value={progress} aria-label={t("progressAria")} />
              <p className="text-[11px] text-muted-foreground">
                {t("progressValue", { percentage: Math.round(progress) })}
              </p>
            </div>
          ) : null}

          {result ? (
            <div className="rounded-2xl border border-border/60 bg-background/80 p-3">
              <div className="flex items-start gap-3">
                <CheckCircle2
                  className="mt-0.5 size-4 shrink-0 text-emerald-600"
                  aria-hidden
                  strokeWidth={2}
                />
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <p className="text-sm font-medium text-foreground">
                    {t("successTitle")}
                  </p>
                  <p className="text-[11px] leading-snug text-muted-foreground">
                    {t("successDescription", {
                      fileName:
                        result.pathname.split("/").at(-1) ?? result.pathname,
                    })}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button asChild variant="outline" size="sm">
                  <a href={result.url} target="_blank" rel="noreferrer">
                    {t("openFile")}
                  </a>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={resetForAnotherUpload}
                >
                  {t("uploadAnother")}
                </Button>
              </div>
            </div>
          ) : null}

          {errorMessage ? (
            <p className="text-xs text-destructive" role="alert">
              {errorMessage}
            </p>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  )
}

export { buildUploadPath as buildNexusUtilityUploadPath, formatFileSize }
