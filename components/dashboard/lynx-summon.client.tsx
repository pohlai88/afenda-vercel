"use client"

import Image from "next/image"
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react"
import { X } from "lucide-react"
import { useTranslations } from "next-intl"

import { useRouteEnvelope } from "#components/route-envelope-context"
import { Button } from "#components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "#components/ui/sheet"
import { Link } from "#i18n/navigation"
import {
  LYNX_ERP_HTTP_ROUTES,
  parseLynxTruthMarkdown,
  type LynxTruthEvidenceDTO,
} from "#features/lynx/client"
import { organizationDashboardPath } from "#lib/dashboard-module-paths"
import { LYNX_SUMMON_MASCOT_PNG } from "#lib/site"
import { cn } from "#lib/utils"

import { buildGroundedTruthQuestion } from "./lynx-grounded-truth-question.shared"
import { useLynxSummon, type LynxGrounding } from "./lynx-summon-context"

const LYNX_SUMMON_FAB_STORAGE_KEY = "afenda:lynx-summon-fab-pos"
const LYNX_SUMMON_FAB_SIZE_PX = 80
const LYNX_SUMMON_FAB_EDGE_PADDING_PX = 16
const LYNX_SUMMON_FAB_DRAG_THRESHOLD_PX = 8

function clampLynxSummonFabPosition(
  right: number,
  bottom: number
): { right: number; bottom: number } {
  if (typeof window === "undefined") {
    return { right, bottom }
  }
  const vw = window.innerWidth
  const vh = window.innerHeight
  const maxRight = Math.max(
    LYNX_SUMMON_FAB_EDGE_PADDING_PX,
    vw - LYNX_SUMMON_FAB_SIZE_PX - LYNX_SUMMON_FAB_EDGE_PADDING_PX
  )
  const maxBottom = Math.max(
    LYNX_SUMMON_FAB_EDGE_PADDING_PX,
    vh - LYNX_SUMMON_FAB_SIZE_PX - LYNX_SUMMON_FAB_EDGE_PADDING_PX
  )
  return {
    right: Math.min(maxRight, Math.max(LYNX_SUMMON_FAB_EDGE_PADDING_PX, right)),
    bottom: Math.min(
      maxBottom,
      Math.max(LYNX_SUMMON_FAB_EDGE_PADDING_PX, bottom)
    ),
  }
}

function useLynxSummonFabDrag(onTap: () => void) {
  const [pos, setPos] = useState({
    right: LYNX_SUMMON_FAB_EDGE_PADDING_PX,
    bottom: LYNX_SUMMON_FAB_EDGE_PADDING_PX,
  })
  const posRef = useRef(pos)

  useLayoutEffect(() => {
    posRef.current = pos
  }, [pos])

  const [isDragging, setIsDragging] = useState(false)
  const suppressClickRef = useRef(false)
  const dragRef = useRef<{
    pointerId: number
    startX: number
    startY: number
    startRight: number
    startBottom: number
  } | null>(null)
  /** Always cleared on drag end or unmount — window listeners must not leak. */
  const removeActiveDragListenersRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    const handle = requestAnimationFrame(() => {
      try {
        const raw = localStorage.getItem(LYNX_SUMMON_FAB_STORAGE_KEY)
        if (raw) {
          const parsed = JSON.parse(raw) as {
            right?: unknown
            bottom?: unknown
          }
          const right = Number(parsed.right)
          const bottom = Number(parsed.bottom)
          if (Number.isFinite(right) && Number.isFinite(bottom)) {
            setPos(clampLynxSummonFabPosition(right, bottom))
            return
          }
        }
      } catch {
        /* ignore corrupt storage */
      }
      setPos((prev) => clampLynxSummonFabPosition(prev.right, prev.bottom))
    })
    return () => cancelAnimationFrame(handle)
  }, [])

  useEffect(() => {
    function onResize() {
      setPos((prev) => clampLynxSummonFabPosition(prev.right, prev.bottom))
    }
    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
  }, [])

  useEffect(() => {
    return () => {
      removeActiveDragListenersRef.current?.()
      removeActiveDragListenersRef.current = null
    }
  }, [])

  const persistPos = useCallback((next: { right: number; bottom: number }) => {
    try {
      localStorage.setItem(LYNX_SUMMON_FAB_STORAGE_KEY, JSON.stringify(next))
    } catch {
      /* ignore */
    }
  }, [])

  const fabPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLButtonElement>) => {
      if (e.button !== 0) return
      removeActiveDragListenersRef.current?.()

      dragRef.current = {
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        startRight: posRef.current.right,
        startBottom: posRef.current.bottom,
      }
      suppressClickRef.current = false
      setIsDragging(true)

      const applyMove = (ev: PointerEvent) => {
        const d = dragRef.current
        if (!d || ev.pointerId !== d.pointerId) return
        const dx = ev.clientX - d.startX
        const dy = ev.clientY - d.startY
        if (
          Math.abs(dx) > LYNX_SUMMON_FAB_DRAG_THRESHOLD_PX ||
          Math.abs(dy) > LYNX_SUMMON_FAB_DRAG_THRESHOLD_PX
        ) {
          suppressClickRef.current = true
        }
        const next = clampLynxSummonFabPosition(
          d.startRight - dx,
          d.startBottom - dy
        )
        setPos(next)
      }

      const finishDrag = (ev: PointerEvent) => {
        const d = dragRef.current
        if (!d || ev.pointerId !== d.pointerId) return

        removeActiveDragListenersRef.current?.()
        removeActiveDragListenersRef.current = null
        dragRef.current = null
        setIsDragging(false)

        let next: { right: number; bottom: number }
        if (ev.type === "pointercancel") {
          next = clampLynxSummonFabPosition(
            posRef.current.right,
            posRef.current.bottom
          )
        } else {
          const dx = ev.clientX - d.startX
          const dy = ev.clientY - d.startY
          if (
            Math.abs(dx) > LYNX_SUMMON_FAB_DRAG_THRESHOLD_PX ||
            Math.abs(dy) > LYNX_SUMMON_FAB_DRAG_THRESHOLD_PX
          ) {
            suppressClickRef.current = true
          }
          next = clampLynxSummonFabPosition(
            d.startRight - dx,
            d.startBottom - dy
          )
        }
        setPos(next)
        persistPos(next)
      }

      const remove = () => {
        window.removeEventListener("pointermove", applyMove)
        window.removeEventListener("pointerup", finishDrag)
        window.removeEventListener("pointercancel", finishDrag)
      }
      removeActiveDragListenersRef.current = remove

      window.addEventListener("pointermove", applyMove)
      window.addEventListener("pointerup", finishDrag)
      window.addEventListener("pointercancel", finishDrag)
    },
    [persistPos]
  )

  const fabClick = useCallback(
    (e: ReactMouseEvent<HTMLButtonElement>) => {
      if (suppressClickRef.current) {
        e.preventDefault()
        e.stopPropagation()
        suppressClickRef.current = false
        return
      }
      onTap()
    },
    [onTap]
  )

  return {
    fabPosition: pos,
    isDraggingFab: isDragging,
    fabPointerDown,
    fabClick,
  }
}

/**
 * Floating Lynx summon — fixed icon (default bottom-right); drag to reposition,
 * persisted in `localStorage` (`afenda:lynx-summon-fab-pos`).
 *
 * Drawer feed is **grounded on the open operational atom** with automatic
 * Truth retrieval (no primary free-text field — plan trade-off §2.7). Deep
 * links to Knowledge + Lynx modules satisfy the multi-layer affordance
 * without turning this shell into a chat surface.
 */

type StreamState =
  | { status: "idle" }
  | { status: "loading" }
  | {
      status: "done"
      evidence: LynxTruthEvidenceDTO[]
      limitationsPreamble: string
      rawMarkdown: string
    }
  | { status: "error"; message: string }

async function consumeTruthStream(
  question: string,
  messages: { errorGeneric: string; errorStream: string }
): Promise<
  | {
      ok: true
      evidence: LynxTruthEvidenceDTO[]
      limitationsPreamble: string
      rawMarkdown: string
    }
  | { ok: false; message: string }
> {
  const res = await fetch(LYNX_ERP_HTTP_ROUTES.truthSearch, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question }),
  })

  if (!res.ok) {
    let message = messages.errorGeneric
    try {
      const data = (await res.json()) as { error?: string }
      if (data.error) message = data.error
    } catch {
      /* ignore */
    }
    return { ok: false, message }
  }

  if (!res.body) {
    return { ok: false, message: messages.errorGeneric }
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ""
  let evidence: LynxTruthEvidenceDTO[] = []
  let limitationsPreamble = ""
  let rawMarkdown = ""

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split("\n")
    buffer = lines.pop() ?? ""
    for (const line of lines) {
      if (!line.trim()) continue
      try {
        const obj = JSON.parse(line) as {
          type?: string
          evidence?: LynxTruthEvidenceDTO[]
          limitationsPreamble?: string
          delta?: string
          message?: string
        }
        if (obj.type === "error" && typeof obj.message === "string") {
          return { ok: false, message: obj.message }
        }
        if (obj.type === "evidence" && Array.isArray(obj.evidence)) {
          evidence = obj.evidence
          limitationsPreamble = obj.limitationsPreamble ?? ""
        } else if (obj.type === "delta" && typeof obj.delta === "string") {
          rawMarkdown += obj.delta
        }
      } catch {
        return { ok: false, message: messages.errorStream }
      }
    }
  }

  if (buffer.trim()) {
    try {
      const obj = JSON.parse(buffer) as { type?: string; delta?: string }
      if (obj.type === "delta" && typeof obj.delta === "string") {
        rawMarkdown += obj.delta
      }
    } catch {
      /* trailing incomplete line */
    }
  }

  return {
    ok: true,
    evidence,
    limitationsPreamble,
    rawMarkdown,
  }
}

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
              key={`${chip.module}:${chip.label}:${i}`}
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

function TruthFeed({
  grounding,
  sheetOpen,
}: {
  grounding: LynxGrounding | null
  sheetOpen: boolean
}) {
  const t = useTranslations("Dashboard.LynxSummon")
  const [state, setState] = useState<StreamState>({ status: "idle" })

  const groundedQuestion = useMemo(
    () => buildGroundedTruthQuestion(grounding),
    [grounding]
  )

  const runRetrieval = useCallback(
    async (question: string) => {
      setState({ status: "loading" })
      const result = await consumeTruthStream(question, {
        errorGeneric: t("errorGeneric"),
        errorStream: t("errorStream"),
      })
      if (!result.ok) {
        setState({ status: "error", message: result.message })
        return
      }
      setState({
        status: "done",
        evidence: result.evidence,
        limitationsPreamble: result.limitationsPreamble,
        rawMarkdown: result.rawMarkdown,
      })
    },
    [t]
  )

  const runRetrievalRef = useRef(runRetrieval)
  useEffect(() => {
    runRetrievalRef.current = runRetrieval
  }, [runRetrieval])

  useEffect(() => {
    if (!sheetOpen || !groundedQuestion) return
    // Defer past the effect tick so the loading transition is not a sync
    // setState directly inside the effect body (react-hooks/set-state-in-effect).
    const handle = requestAnimationFrame(() => {
      void runRetrievalRef.current(groundedQuestion)
    })
    return () => cancelAnimationFrame(handle)
    // Intentionally omit `runRetrieval`: next-intl's `t` can change identity and
    // would retrigger this effect every render while the sheet is open.
  }, [sheetOpen, groundedQuestion])

  const parsed = useMemo(() => {
    if (state.status !== "done") return null
    return parseLynxTruthMarkdown(state.rawMarkdown)
  }, [state])

  if (!groundedQuestion) {
    return (
      <p className="text-sm text-muted-foreground">{t("truthIdleNoAtom")}</p>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1 space-y-1">
          <p className="font-mono text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
            {t("truthLabel")}
          </p>
          <p className="line-clamp-4 text-xs text-muted-foreground">
            <span className="font-mono text-[10px] text-primary uppercase">
              {t("groundedQueryLabel")}{" "}
            </span>
            {groundedQuestion}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0"
          disabled={state.status === "loading"}
          onClick={() => void runRetrieval(groundedQuestion)}
        >
          {state.status === "loading" ? t("pending") : t("refreshTruth")}
        </Button>
      </div>

      {state.status === "error" ? (
        <p className="text-xs text-destructive" role="alert">
          {state.message}
        </p>
      ) : null}

      {state.status === "loading" ? (
        <p className="text-xs text-muted-foreground">{t("retrievingTruth")}</p>
      ) : null}

      {state.status === "done" ? (
        <div className="space-y-4 border-t pt-3">
          <div>
            <p className="font-mono text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
              {t("answerLabel")}
            </p>
            <div className="mt-1.5 text-sm whitespace-pre-wrap text-foreground">
              {parsed?.answer || state.rawMarkdown || "—"}
            </div>
          </div>

          <div>
            <p className="font-mono text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
              {t("evidenceLabel")}
            </p>
            {state.evidence.length === 0 ? (
              <p className="mt-1.5 text-xs text-muted-foreground">
                {t("evidenceEmpty")}
              </p>
            ) : (
              <ul className="mt-1.5 space-y-1.5">
                {state.evidence.map((row) => (
                  <li
                    key={row.id}
                    className="rounded-md border bg-muted/30 px-2.5 py-1.5 text-xs"
                  >
                    <span className="font-medium text-foreground">
                      {row.title}
                    </span>
                    <span className="ml-1.5 font-mono text-[10px] text-muted-foreground">
                      d={row.distance.toFixed(3)}
                    </span>
                    <p className="mt-1 line-clamp-3 text-muted-foreground">
                      {row.body}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {state.limitationsPreamble || parsed?.limitations ? (
            <div>
              <p className="font-mono text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
                {t("limitationsLabel")}
              </p>
              {state.limitationsPreamble ? (
                <p className="mt-1.5 text-xs text-muted-foreground">
                  {state.limitationsPreamble}
                </p>
              ) : null}
              {parsed?.limitations ? (
                <div className="mt-1.5 text-sm whitespace-pre-wrap text-foreground">
                  {parsed.limitations}
                </div>
              ) : null}
            </div>
          ) : null}

          {parsed?.nextSafeAction ? (
            <div>
              <p className="font-mono text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
                {t("nextActionLabel")}
              </p>
              <div className="mt-1.5 text-sm whitespace-pre-wrap text-foreground">
                {parsed.nextSafeAction}
              </div>
            </div>
          ) : null}
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

export function LynxSummon() {
  const t = useTranslations("Dashboard.LynxSummon")
  const { grounding, open, openSummon, closeSummon, toggleSummon } =
    useLynxSummon()

  const { fabPosition, isDraggingFab, fabPointerDown, fabClick } =
    useLynxSummonFabDrag(toggleSummon)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null
      const isTyping =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable
      if (isTyping) return
      if (e.key === "?" && !open) {
        openSummon()
        e.preventDefault()
      }
    }
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("keydown", onKey)
    }
  }, [open, openSummon])

  return (
    <>
      <button
        type="button"
        aria-label={`${t("triggerAria")}. ${t("dragHint")}.`}
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
