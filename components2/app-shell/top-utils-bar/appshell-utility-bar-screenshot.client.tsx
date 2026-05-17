"use client"

import { useCallback, useRef, useState } from "react"
import { Camera, Copy, Download, Loader2 } from "lucide-react"

import { cn } from "#lib/utils"

import { Button } from "../../ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "../../ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipTrigger } from "../../ui/tooltip"
import {
  APP_SHELL_UTILITY_L2_MENU_TRIGGER_OPEN_STATE_CLASS,
  APP_SHELL_UTILITY_RAIL_MENU_SURFACE_CLASS,
} from "./appshell-utility-bar-dropdown-chrome.shared"
import { APP_SHELL_UTILITY_L2_ICON_CLASS } from "./appshell-utility-bar.client"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ScreenshotPhase =
  | { kind: "idle" }
  | { kind: "preview"; dataUrl: string }
  | { kind: "error"; message: string }

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  return fetch(dataUrl).then((res) => {
    if (!res.ok) throw new Error("Could not read capture")
    return res.blob()
  })
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/** Right-rail workspace screenshot — DropdownMenu + html2canvas (close-before-capture). */
export function UtilityBarScreenshotPanel() {
  const [open, setOpen] = useState(false)
  const [phase, setPhase] = useState<ScreenshotPhase>({ kind: "idle" })
  const [isCapturing, setIsCapturing] = useState(false)
  const isCapturingRef = useRef(false)
  const [copyHint, setCopyHint] = useState<string | null>(null)
  const closingForCaptureRef = useRef(false)

  const reset = useCallback(() => {
    setPhase({ kind: "idle" })
    setCopyHint(null)
  }, [])

  function handleOpenChange(next: boolean) {
    if (!next && closingForCaptureRef.current) {
      closingForCaptureRef.current = false
      setOpen(false)
      return
    }
    setOpen(next)
    if (!next && !isCapturingRef.current) {
      reset()
    }
  }

  async function startCapture() {
    setCopyHint(null)
    closingForCaptureRef.current = true
    setOpen(false)
    isCapturingRef.current = true
    setIsCapturing(true)
    await new Promise((r) => setTimeout(r, 220))
    try {
      const { default: html2canvas } = await import("html2canvas")
      const canvas = await html2canvas(document.documentElement, {
        useCORS: true,
        scale: 1,
        logging: false,
        backgroundColor: null,
      })
      const dataUrl = canvas.toDataURL("image/png")
      setPhase({ kind: "preview", dataUrl })
    } catch (err) {
      const message =
        err instanceof Error && err.message.trim().length > 0
          ? err.message
          : "Capture failed"
      setPhase({ kind: "error", message })
    } finally {
      isCapturingRef.current = false
      setIsCapturing(false)
      setOpen(true)
    }
  }

  async function copyToClipboard() {
    if (phase.kind !== "preview") return
    setCopyHint(null)
    try {
      const blob = await dataUrlToBlob(phase.dataUrl)
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blob }),
      ])
      setCopyHint("Copied to clipboard")
    } catch {
      setCopyHint("Copy failed — try Download instead")
    }
  }

  function triggerDownload() {
    if (phase.kind !== "preview") return
    const a = document.createElement("a")
    a.href = phase.dataUrl
    a.download = `workspace-snapshot-${Date.now()}.png`
    a.rel = "noopener"
    a.click()
  }

  return (
    <DropdownMenu open={open} onOpenChange={handleOpenChange}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Screenshot"
              aria-busy={isCapturing}
              disabled={isCapturing}
              className={cn(
                APP_SHELL_UTILITY_L2_ICON_CLASS,
                APP_SHELL_UTILITY_L2_MENU_TRIGGER_OPEN_STATE_CLASS,
                isCapturing && "pointer-events-none opacity-70"
              )}
            >
              <span
                aria-hidden
                className="size-[15px] shrink-0 [&>svg]:size-full"
              >
                {isCapturing ? (
                  <Loader2 className="animate-spin" strokeWidth={2} />
                ) : (
                  <Camera strokeWidth={2} />
                )}
              </span>
            </button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom" align="center" sideOffset={8}>
          Screenshot
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
        className={cn("w-80 p-0", APP_SHELL_UTILITY_RAIL_MENU_SURFACE_CLASS)}
      >
        <div className="shrink-0 border-b border-border/50 px-4 py-3">
          <p className="text-xs font-semibold tracking-tight text-card-foreground">
            Screenshot
          </p>
          <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
            Captures the visible page. The menu closes briefly while the image
            is rendered so it is not included in the shot.
          </p>
        </div>

        <div className="space-y-3 px-4 py-4">
          {phase.kind === "idle" && (
            <Button
              type="button"
              size="sm"
              className="w-full"
              onClick={() => void startCapture()}
            >
              Capture workspace
            </Button>
          )}

          {phase.kind === "error" && (
            <div className="space-y-3">
              <p className="text-[11px] text-destructive">{phase.message}</p>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="w-full"
                onClick={() => void startCapture()}
              >
                Try again
              </Button>
            </div>
          )}

          {phase.kind === "preview" && (
            <div className="space-y-3">
              <div className="overflow-hidden rounded-md border border-border/60 bg-muted/20">
                {/* eslint-disable-next-line @next/next/no-img-element -- data URL preview */}
                <img
                  src={phase.dataUrl}
                  alt="Workspace capture preview"
                  className="mx-auto max-h-40 w-auto object-contain"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="flex-1 gap-1.5"
                  onClick={triggerDownload}
                >
                  <Download className="size-3.5" strokeWidth={2} />
                  Download PNG
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="flex-1 gap-1.5"
                  onClick={() => void copyToClipboard()}
                >
                  <Copy className="size-3.5" strokeWidth={2} />
                  Copy
                </Button>
              </div>
              {copyHint ? (
                <p className="text-center text-[10px] text-muted-foreground">
                  {copyHint}
                </p>
              ) : null}
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="w-full"
                onClick={reset}
              >
                Capture again
              </Button>
            </div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
