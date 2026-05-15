"use client"

import { useEffect, useMemo, useState } from "react"
import { toBlob as captureToBlob } from "html-to-image"
import { Camera, CheckCircle2 } from "lucide-react"
import { upload as uploadBlob } from "@vercel/blob/client"
import { useTranslations } from "next-intl"

import { Button } from "#components/ui/button"
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "#components/ui/empty"
import { Popover, PopoverContent, PopoverTrigger } from "#components/ui/popover"
import { Spinner } from "#components/ui/spinner"
import { ToggleGroup, ToggleGroupItem } from "#components/ui/toggle-group"
import { cn } from "#lib/utils"

import { WORKBENCH_UTILITY_ROUND_CONTROL_CLASS } from "../workbench-utility-round-control-class"
import { WorkbenchUtilityTriggerTooltip } from "./workbench-utility-trigger-tooltip"

type BlobUploadResult = Awaited<ReturnType<typeof uploadBlob>>
type ScreenshotMode = "workspace" | "content"
type CapturedScreenshot = {
  blob: Blob
  fileName: string
  mode: ScreenshotMode
  previewSrc: string
}

type WorkbenchUtilityScreenshotProps = {
  orgId: string
}

function buildScreenshotFileName(mode: ScreenshotMode): string {
  return `${mode}-${Date.now()}.png`
}

function buildScreenshotUploadPath(orgId: string, fileName: string): string {
  return `orgs/${orgId}/nexus-screenshot/${fileName}`
}

function getCaptureRoot(mode: ScreenshotMode): HTMLElement | null {
  return document.querySelector<HTMLElement>(
    `[data-workbench-capture-root="${mode}"]`
  )
}

function waitForNextPaint(): Promise<void> {
  return new Promise((resolve) => {
    window.requestAnimationFrame(() => resolve())
  })
}


/**
 * Quick viewport capture utility for governed screenshot intake from the Nexus right rail.
 * v1 captures one PNG at a time, previews it, then uploads through the existing Blob route.
 */
export function WorkbenchUtilityScreenshot({
  orgId,
}: WorkbenchUtilityScreenshotProps) {
  const t = useTranslations("Dashboard.shell.utilityBar.screenshot")
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<ScreenshotMode>("workspace")
  const [capturing, setCapturing] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [captured, setCaptured] = useState<CapturedScreenshot | null>(null)
  const [uploaded, setUploaded] = useState<BlobUploadResult | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    return () => {
      if (captured?.previewSrc) {
        URL.revokeObjectURL(captured.previewSrc)
      }
    }
  }, [captured])

  const modeOptions = useMemo(
    () =>
      [
        { id: "workspace", label: t("mode.workspace") },
        { id: "content", label: t("mode.content") },
      ] as const,
    [t]
  )

  function clearCapturedScreenshot() {
    setCaptured((previous) => {
      if (previous?.previewSrc) {
        URL.revokeObjectURL(previous.previewSrc)
      }
      return null
    })
  }

  async function handleCapture() {
    setCapturing(true)
    setErrorMessage(null)
    setUploaded(null)
    setOpen(false)

    try {
      await waitForNextPaint()
      await waitForNextPaint()

      const target = getCaptureRoot(mode)
      if (!target) {
        throw new Error(t("errorTargetMissing"))
      }

      const blob = await captureToBlob(target, {
        pixelRatio: Math.min(window.devicePixelRatio || 1, 2),
        filter: (element) =>
          !element.hasAttribute("data-nexus-capture-exclude"),
      })
      if (!blob) throw new Error(t("errorCapture"))
      const previewSrc = URL.createObjectURL(blob)
      const fileName = buildScreenshotFileName(mode)

      setCaptured((previous) => {
        if (previous?.previewSrc) {
          URL.revokeObjectURL(previous.previewSrc)
        }
        return {
          blob,
          fileName,
          mode,
          previewSrc,
        }
      })
    } catch (error) {
      setErrorMessage(
        error instanceof Error && error.message.trim().length > 0
          ? error.message
          : t("errorCapture")
      )
    } finally {
      setCapturing(false)
      setOpen(true)
    }
  }

  async function handleUpload() {
    if (!captured) {
      setErrorMessage(t("errorNoCapture"))
      return
    }

    setUploading(true)
    setErrorMessage(null)

    try {
      const result = await uploadBlob(
        buildScreenshotUploadPath(orgId, captured.fileName),
        captured.blob,
        {
          access: "public",
          contentType: "image/png",
          handleUploadUrl: "/api/upload/blob",
          clientPayload: JSON.stringify({
            source: "nexus-utility-screenshot",
            captureMode: captured.mode,
            fileName: captured.fileName,
            fileSize: captured.blob.size,
            mimeType: "image/png",
            routePath:
              typeof window !== "undefined" ? window.location.pathname : null,
          }),
        }
      )
      setUploaded(result)
    } catch (error) {
      setErrorMessage(
        error instanceof Error && error.message.trim().length > 0
          ? error.message
          : t("errorUpload")
      )
    } finally {
      setUploading(false)
    }
  }

  function resetCapture() {
    clearCapturedScreenshot()
    setUploaded(null)
    setErrorMessage(null)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <WorkbenchUtilityTriggerTooltip tooltip={t("tooltip")} align="end">
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={t("trigger")}
            className={cn(WORKBENCH_UTILITY_ROUND_CONTROL_CLASS)}
          >
            <Camera
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
        data-nexus-capture-exclude
      >
        <div className="border-b border-border/50 px-4 py-3">
          <p className="text-xs font-medium text-foreground">{t("title")}</p>
          <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
            {t("description")}
          </p>
        </div>

        <div className="flex flex-col gap-3 p-4">
          <div className="flex flex-col gap-2">
            <p className="text-[11px] font-medium text-muted-foreground">
              {t("modeLabel")}
            </p>
            <ToggleGroup
              type="single"
              value={mode}
              variant="outline"
              size="sm"
              spacing={0}
              onValueChange={(value) => {
                if (value === "workspace" || value === "content") {
                  setMode(value)
                  clearCapturedScreenshot()
                  setUploaded(null)
                  setErrorMessage(null)
                }
              }}
            >
              {modeOptions.map((option) => (
                <ToggleGroupItem key={option.id} value={option.id}>
                  {option.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>

          <div className="overflow-hidden rounded-2xl border border-border/60 bg-muted/20">
            {captured ? (
              <div className="flex flex-col gap-3 p-3">
                <div className="overflow-hidden rounded-xl border border-border/50 bg-background/80">
                  {/* eslint-disable-next-line @next/next/no-img-element -- preview uses a local blob URL */}
                  <img
                    src={captured.previewSrc}
                    alt={t("previewAlt")}
                    className="aspect-video h-auto w-full object-cover"
                  />
                </div>
                <p className="text-[11px] leading-snug text-muted-foreground">
                  {t("previewReady", { mode: t(`mode.${captured.mode}`) })}
                </p>
              </div>
            ) : (
              <Empty className="border-0 px-4 py-8">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <Camera aria-hidden strokeWidth={1.5} />
                  </EmptyMedia>
                  <EmptyTitle className="text-sm">{t("emptyState")}</EmptyTitle>
                </EmptyHeader>
              </Empty>
            )}
          </div>

          {uploaded ? (
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
                    {t("successDescription")}
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          {errorMessage ? (
            <p className="text-xs text-destructive" role="alert">
              {errorMessage}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant={captured ? "outline" : "default"}
              size="sm"
              disabled={capturing || uploading}
              onClick={handleCapture}
            >
              {capturing ? (
                <>
                  <Spinner aria-hidden />
                  {t("capturing")}
                </>
              ) : captured ? (
                t("retake")
              ) : (
                t("capture")
              )}
            </Button>
            {captured ? (
              <Button
                type="button"
                size="sm"
                disabled={capturing || uploading}
                onClick={handleUpload}
              >
                {uploading ? (
                  <>
                    <Spinner aria-hidden />
                    {t("uploading")}
                  </>
                ) : (
                  t("upload")
                )}
              </Button>
            ) : null}
            {captured ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={capturing || uploading}
                onClick={resetCapture}
              >
                {t("clear")}
              </Button>
            ) : null}
            {uploaded ? (
              <Button asChild type="button" size="sm" variant="outline">
                <a href={uploaded.url} target="_blank" rel="noreferrer">
                  {t("openFile")}
                </a>
              </Button>
            ) : null}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

export { buildScreenshotUploadPath }
