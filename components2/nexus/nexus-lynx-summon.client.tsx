"use client"

import Image from "next/image"
import { useEffect, useRef } from "react"
import { X } from "lucide-react"
import { useTranslations } from "next-intl"

import { useRouteEnvelope } from "#components2/route-envelope-context.client"
import { Button } from "#components2/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "#components2/ui/sheet"
import { Link } from "#i18n/navigation"
import { organizationDashboardPath } from "#lib/dashboard-module-paths"
import { LYNX_SUMMON_MASCOT_PNG } from "#lib/site"
import { cn } from "#lib/utils"

import { useLynxSummon, type LynxGrounding } from "./nexus-lynx-summon-context"
import { useLynxSummonFabDrag } from "./nexus-lynx-summon-fab"
import { TruthFeed } from "./nexus-lynx-truth-feed"

function GroundingHeader({ grounding }: { grounding: LynxGrounding | null }) {
  const t = useTranslations("Dashboard.LynxSummon")

  if (!grounding) {
    return (
      <div className="rounded-lg border border-dashed bg-muted/30 px-3 py-2.5">
        <p className="font-mono text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
          {t("groundingNoneLabel")}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("groundingNoneDescription")}
        </p>
      </div>
    )
  }

  const chips = grounding.chips?.slice(0, 3) ?? []

  return (
    <div className="rounded-lg border bg-muted/30 px-3 py-2.5">
      <p className="font-mono text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
        {t("groundingLabel")}
      </p>
      <p className="mt-1 line-clamp-2 text-sm font-medium text-foreground">
        {grounding.title}
      </p>
      {grounding.summary ? (
        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
          {grounding.summary}
        </p>
      ) : null}
      {chips.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {chips.map((chip, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 rounded-sm border bg-card px-1.5 py-0.5 text-[10.5px] text-muted-foreground"
            >
              <span className="font-mono text-[9px] font-semibold tracking-wider text-primary">
                {chip.module}
              </span>
              <span className="text-foreground">{chip.label}</span>
              {chip.meta ? (
                <span className="font-mono text-[9px] text-muted-foreground">
                  {chip.meta}
                </span>
              ) : null}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  )
}

function DeepDiveLinks() {
  const t = useTranslations("Dashboard.LynxSummon")
  const envelope = useRouteEnvelope()
  const slug = envelope?.orgSlug?.trim()
  if (!slug) return null

  return (
    <div className="space-y-2 border-t pt-4">
      <p className="font-mono text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
        {t("deepDiveLabel")}
      </p>
      <div className="flex flex-col gap-2 text-sm">
        <Link
          href={organizationDashboardPath(slug, "knowledge")}
          prefetch={false}
          className="text-primary underline-offset-4 hover:underline"
        >
          {t("openKnowledge")}
        </Link>
        <Link
          href={organizationDashboardPath(slug, "lynx")}
          prefetch={false}
          className="text-primary underline-offset-4 hover:underline"
        >
          {t("openOperatorAssist")}
        </Link>
      </div>
    </div>
  )
}

/**
 * Floating Lynx summon — fixed icon (default bottom-right); drag to reposition,
 * persisted in `localStorage` (`afenda:lynx-summon-fab-pos`).
 *
 * Drawer retrieval is driven by the registered operational grounding (no general
 * purpose chat input). Links to Knowledge and Lynx remain the explicit deep-dive path.
 */
export function LynxSummon() {
  const t = useTranslations("Dashboard.LynxSummon")
  const { grounding, open, openSummon, closeSummon, toggleSummon } =
    useLynxSummon()

  const { fabPosition, isDraggingFab, fabPointerDown, fabClick } =
    useLynxSummonFabDrag(toggleSummon)

  const openRef = useRef(open)
  useEffect(() => {
    openRef.current = open
  }, [open])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null
      const isTyping =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable
      if (isTyping) return
      if (e.key === "?" && !openRef.current) {
        openSummon()
        e.preventDefault()
      }
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
    // openSummon is stable (useCallback with no deps); openRef is a ref (not reactive)
  }, [openSummon])

  const fabAriaLabel = grounding
    ? `${t("triggerAriaGrounded", { title: grounding.title })}. ${t("dragHint")}.`
    : `${t("triggerAria")}. ${t("dragHint")}.`

  return (
    <>
      <button
        type="button"
        aria-label={fabAriaLabel}
        aria-expanded={open}
        aria-keyshortcuts="?"
        style={{
          right: fabPosition.right,
          bottom: fabPosition.bottom,
        }}
        onPointerDown={fabPointerDown}
        onClick={fabClick}
        onDragStart={(e) => {
          e.preventDefault()
        }}
        className={cn(
          "fixed z-40 touch-none rounded-sm select-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none",
          "drop-shadow-xl",
          isDraggingFab
            ? "cursor-grabbing motion-safe:transition-none motion-reduce:transition-none"
            : "cursor-grab motion-safe:transition-transform motion-safe:hover:scale-110 motion-reduce:transition-none motion-reduce:hover:scale-100",
          grounding ? "opacity-100" : "opacity-90 hover:opacity-100"
        )}
      >
        <span className="relative inline-block">
          <Image
            src={LYNX_SUMMON_MASCOT_PNG}
            alt=""
            width={80}
            height={80}
            draggable={false}
            className="pointer-events-none size-20 object-contain mix-blend-multiply dark:mix-blend-screen"
            aria-hidden
          />
          {grounding ? (
            <span
              aria-hidden
              className="absolute top-2 right-2 size-2.5 rounded-full bg-primary ring-2 ring-background"
            />
          ) : null}
        </span>
      </button>

      <Sheet
        open={open}
        onOpenChange={(next) => (next ? openSummon() : closeSummon())}
      >
        <SheetContent
          side="right"
          showCloseButton={false}
          className={cn(
            "flex w-full flex-col gap-4 p-0 sm:max-w-md",
            "motion-reduce:!transition-none motion-reduce:data-open:animate-none motion-reduce:data-closed:animate-none"
          )}
        >
          <header className="flex items-start justify-between gap-3 border-b px-5 pt-5 pb-4">
            <div className="flex flex-col gap-1">
              <p className="font-mono text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
                {t("eyebrow")}
              </p>
              <SheetTitle className="text-base font-semibold tracking-tight">
                {t("title")}
              </SheetTitle>
              <SheetDescription className="text-xs text-muted-foreground">
                {t("description")}
              </SheetDescription>
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={closeSummon}
              aria-label={t("closeAria")}
            >
              <X className="size-4" />
            </Button>
          </header>
          <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-5 pb-6">
            <GroundingHeader grounding={grounding} />
            <TruthFeed
              key={grounding?.id ?? "no-grounding"}
              grounding={grounding}
              sheetOpen={open}
            />
            <DeepDiveLinks />
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
