"use client"

import { useActionState, useCallback, useRef, useState } from "react"
import { useTranslations } from "next-intl"

import { Button } from "#components2/ui/button"
import { Checkbox } from "#components2/ui/checkbox"
import { Input } from "#components2/ui/input"
import { Label } from "#components2/ui/label"
import { Textarea } from "#components2/ui/textarea"

import {
  declinePortalSignatureAction,
  submitPortalSignatureAction,
} from "../actions/employee-portal-signature.actions"

export type SignatureCeremonyClientProps = {
  portalSlug: string
  partyToken: string
  declarationText: string
  documentPreviewUrl: string | null
  documentTitle: string | null
}

async function sha256HexFromCanvas(canvas: HTMLCanvasElement): Promise<string> {
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((value) => resolve(value), "image/png")
  )
  if (!blob) {
    throw new Error("Unable to capture drawn signature")
  }
  const buffer = await blob.arrayBuffer()
  const digest = await crypto.subtle.digest("SHA-256", buffer)
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
}

export function SignatureCeremonyClient({
  portalSlug,
  partyToken,
  declarationText,
  documentPreviewUrl,
  documentTitle,
}: SignatureCeremonyClientProps) {
  const t = useTranslations("Dashboard.Hrm.portalSignatures")
  const [consentAt] = useState(() => new Date().toISOString())
  const [mode, setMode] = useState<"typed" | "drawn">("typed")
  const [drawnHash, setDrawnHash] = useState<string>("")
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawingRef = useRef(false)

  const [signState, signAction, signPending] = useActionState(
    submitPortalSignatureAction,
    undefined
  )
  const [declineState, declineAction, declinePending] = useActionState(
    declinePortalSignatureAction,
    undefined
  )

  const startDraw = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current
      if (!canvas) return
      drawingRef.current = true
      const rect = canvas.getBoundingClientRect()
      const ctx = canvas.getContext("2d")
      if (!ctx) return
      ctx.strokeStyle = "currentColor"
      ctx.lineWidth = 2
      ctx.lineCap = "round"
      ctx.beginPath()
      ctx.moveTo(event.clientX - rect.left, event.clientY - rect.top)
    },
    []
  )

  const draw = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.lineTo(event.clientX - rect.left, event.clientY - rect.top)
    ctx.stroke()
  }, [])

  const endDraw = useCallback(async () => {
    drawingRef.current = false
    const canvas = canvasRef.current
    if (!canvas) return
    try {
      const hash = await sha256HexFromCanvas(canvas)
      setDrawnHash(hash)
    } catch {
      setDrawnHash("")
    }
  }, [])

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setDrawnHash("")
  }, [])

  return (
    <div className="flex flex-col gap-6">
      {documentPreviewUrl ? (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-medium">
            {documentTitle ?? t("documentPreviewTitle")}
          </h2>
          <iframe
            title={documentTitle ?? t("documentPreviewTitle")}
            src={documentPreviewUrl}
            className="h-[min(480px,60vh)] w-full rounded-lg border border-border"
          />
        </section>
      ) : null}

      <section className="rounded-lg border border-border p-4">
        <h2 className="text-sm font-medium">{t("declarationTitle")}</h2>
        <p className="mt-2 text-sm whitespace-pre-wrap text-muted-foreground">
          {declarationText}
        </p>
      </section>

      <form action={signAction} className="flex flex-col gap-4">
        <input type="hidden" name="portalSlug" value={portalSlug} />
        <input type="hidden" name="partyToken" value={partyToken} />
        <input type="hidden" name="consentAt" value={consentAt} />
        <input type="hidden" name="declarationAcknowledged" value="true" />

        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant={mode === "typed" ? "default" : "outline"}
            onClick={() => setMode("typed")}
          >
            {t("typedMode")}
          </Button>
          <Button
            type="button"
            size="sm"
            variant={mode === "drawn" ? "default" : "outline"}
            onClick={() => setMode("drawn")}
          >
            {t("drawnMode")}
          </Button>
        </div>

        {mode === "typed" ? (
          <div className="flex flex-col gap-2">
            <Label htmlFor="typedName">{t("typedNameLabel")}</Label>
            <Input
              id="typedName"
              name="typedName"
              autoComplete="name"
              required
            />
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <Label>{t("drawSignatureLabel")}</Label>
            <canvas
              ref={canvasRef}
              width={480}
              height={160}
              className="w-full touch-none rounded-md border border-border bg-background"
              onPointerDown={startDraw}
              onPointerMove={draw}
              onPointerUp={() => void endDraw()}
              onPointerLeave={() => void endDraw()}
            />
            <input
              type="hidden"
              name="drawnSignatureSha256"
              value={drawnHash}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={clearCanvas}
            >
              {t("clearDrawAction")}
            </Button>
          </div>
        )}

        <div className="flex items-center gap-2">
          <Checkbox id="ack" checked disabled />
          <Label htmlFor="ack">{t("ackLabel")}</Label>
        </div>

        {signState && !signState.ok ? (
          <p className="text-sm text-destructive">{signState.errors.form}</p>
        ) : null}
        {signState?.ok ? (
          <p className="text-sm text-primary">{t("signedSuccess")}</p>
        ) : null}

        <Button type="submit" className="min-h-11" disabled={signPending}>
          {t("signAction")}
        </Button>
      </form>

      <form
        action={declineAction}
        className="flex flex-col gap-3 border-t pt-4"
      >
        <input type="hidden" name="portalSlug" value={portalSlug} />
        <input type="hidden" name="partyToken" value={partyToken} />
        <Label htmlFor="reason">{t("declineReasonLabel")}</Label>
        <Textarea id="reason" name="reason" rows={3} required />
        {declineState && !declineState.ok ? (
          <p className="text-sm text-destructive">{declineState.errors.form}</p>
        ) : null}
        <Button
          type="submit"
          variant="outline"
          className="min-h-11"
          disabled={declinePending}
        >
          {t("declineAction")}
        </Button>
      </form>
    </div>
  )
}
