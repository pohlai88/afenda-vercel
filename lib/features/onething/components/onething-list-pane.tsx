"use client"

import { useEffect, useMemo, useRef } from "react"

import { useTranslations } from "next-intl"

import { formatAmbientTime, HOUR_MS } from "./hooks/ambient-time.shared"

import type { RankedOneThing } from "#features/onething/client"

import { useFlip } from "./hooks/use-flip"
import { useNow } from "./hooks/use-now"
import { useViewedIds } from "./hooks/use-viewed-ids"
import { OneThingDetailComposer } from "./onething-detail-composer"
import type { ComponentProps } from "react"

/**
 * List pane — single-line operational memory.
 *
 * Row anatomy (locked by `.cursor/rules/onething-directory.mdc`):
 *
 *   [optional 2px focused-row rail] · title · [optional 6px activity dot] · ambient time
 *
 * No preview line. No severity badge. No assignee chip. No avatar stack.
 * Visual hierarchy lives in three axes:
 *
 *   - severity → font-weight (`font-semibold` for critical/high, normal for medium/low)
 *   - familiarity → opacity (viewedIds via `useSyncExternalStore`, LRU-capped)
 *   - in-session new activity → 5px primary dot in the time column
 *
 * Section labels are suppressed except `Today` when items exist there.
 * `Today` renders as a quiet neutral line — never as eyebrow chrome
 * (uppercase / tracking-widest is forbidden by the doctrine).
 */

function isToday(date: Date, now: number): boolean {
  if (now === 0) return false
  const a = new Date(date)
  const b = new Date(now)
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

export function OneThingListPane({
  items,
  currentId,
  composerActions,
  onSelect,
  composerSeed,
}: {
  items: readonly RankedOneThing[]
  currentId: string | null
  composerActions: ComponentProps<typeof OneThingDetailComposer>["actions"]
  onSelect: (id: string) => void
  composerSeed?: string
}) {
  const t = useTranslations("Dashboard.OneThing")

  const now = useNow()
  const { viewed, markViewed } = useViewedIds()

  // Track focus → mark as viewed (familiarity opacity drop kicks in next render).
  const previousFocusRef = useRef<string | null>(null)
  useEffect(() => {
    if (!currentId || currentId === previousFocusRef.current) return
    previousFocusRef.current = currentId
    markViewed(currentId)
  }, [currentId, markViewed])

  const todayItems = useMemo(
    () => items.filter((i) => isToday(i.updatedAt, now)),
    [items, now]
  )
  const restItems = useMemo(
    () => (now > 0 ? items.filter((i) => !isToday(i.updatedAt, now)) : items),
    [items, now]
  )

  const flipKey = useMemo(() => items.map((i) => i.id), [items])
  const registerFlip = useFlip(flipKey)

  return (
    <nav
      aria-label={t("shell.listLabel")}
      className="flex h-full flex-col overflow-hidden bg-background"
    >
      <OneThingDetailComposer actions={composerActions} pendingDraft={null} />

      <ul className="flex-1 overflow-y-auto select-none">
        {todayItems.length > 0 ? (
          <li
            aria-hidden
            className="px-3 pt-3 pb-1.5 text-xs text-muted-foreground/70"
          >
            {t("shell.todayLabel")}
          </li>
        ) : null}
        {todayItems.map((item) => (
          <ListRow
            key={item.id}
            item={item}
            current={currentId === item.id}
            viewed={viewed.has(item.id)}
            now={now}
            onSelect={onSelect}
            registerRef={registerFlip(item.id)}
          />
        ))}

        {restItems.map((item) => (
          <ListRow
            key={item.id}
            item={item}
            current={currentId === item.id}
            viewed={viewed.has(item.id)}
            now={now}
            onSelect={onSelect}
            registerRef={registerFlip(item.id)}
          />
        ))}

        {items.length === 0 && composerSeed === "" ? (
          <li className="px-3 pt-6 pb-2 text-xs text-muted-foreground italic">
            {t("queueClearTitle")}
          </li>
        ) : null}
      </ul>
    </nav>
  )
}

function ListRow({
  item,
  current,
  viewed,
  now,
  onSelect,
  registerRef,
}: {
  item: RankedOneThing
  current: boolean
  viewed: boolean
  now: number
  onSelect: (id: string) => void
  registerRef: (node: HTMLElement | null) => void
}) {
  const t = useTranslations("Dashboard.OneThing")

  const updatedMs = item.updatedAt.getTime()
  const ago = now > 0 ? formatAmbientTime(Math.max(0, now - updatedMs), t) : ""
  const fresh = now > 0 && now - updatedMs < HOUR_MS

  const weight =
    item.severity === "critical" || item.severity === "high"
      ? "font-semibold"
      : "font-normal"
  const familiarity =
    viewed && !current ? "text-foreground/60" : "text-foreground"

  return (
    <li ref={registerRef} className="relative">
      <button
        type="button"
        onClick={() => onSelect(item.id)}
        aria-current={current ? "true" : undefined}
        className={`group relative flex min-h-[44px] w-full items-baseline gap-3 px-3 py-2 text-left transition-colors hover:bg-muted/30 focus-visible:bg-muted/40 focus-visible:outline-none ${
          current
            ? "before:absolute before:top-2 before:bottom-2 before:left-0 before:w-0.5 before:rounded-full before:bg-primary"
            : ""
        }`}
      >
        <span
          className={`flex-1 truncate text-sm leading-snug ${weight} ${familiarity}`}
        >
          {item.title}
        </span>
        {fresh && !current ? (
          <span
            aria-hidden
            className="inline-block size-[5px] shrink-0 rounded-full bg-primary"
          />
        ) : null}
        <span className="shrink-0 text-[11px] text-muted-foreground/80">
          {ago}
        </span>
      </button>
    </li>
  )
}
