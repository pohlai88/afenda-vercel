"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"

import {
  describeAuditEvent7W1H,
  type AuditEvent7W1H,
} from "#lib/erp/audit-7w1h.shared"

/**
 * Continuity footer — the operator's narrative audit trail.
 *
 * Default state is a single quiet line:
 *
 *   Last activity 3m ago · 4 events  ·  Show
 *
 * That carries the count and timestamp without forcing the events into
 * the reading flow. Tapping "Show" reveals the events as a continuity
 * thread (top-N by recency) styled as quiet narrative lines — no labels,
 * no severity colors, no event-type chips. "Hide" collapses back.
 *
 * The collapse is a UX choice, not a compliance one: the count and
 * timestamp are always visible, so auditors are never blocked by the
 * default state — one tap reveals the trail.
 */

const HOUR_MS = 60 * 60 * 1000
const DAY_MS = 24 * HOUR_MS
const VISIBLE_THRESHOLD = 6

function ambientAgo(
  msAgo: number,
  t: ReturnType<typeof useTranslations>
): string {
  if (msAgo < 60_000) return t("shell.ambientTimeJustNow")
  if (msAgo < HOUR_MS) {
    const m = Math.max(1, Math.round(msAgo / 60_000))
    return t("shell.ambientTimeMinutes", { m })
  }
  if (msAgo < DAY_MS) {
    const h = Math.max(1, Math.floor(msAgo / HOUR_MS))
    return t("shell.ambientTimeHours", { h })
  }
  const d = Math.max(1, Math.floor(msAgo / DAY_MS))
  return t("shell.ambientTimeDays", { d })
}

function latestWhenMs(events: AuditEvent7W1H[]): number | null {
  let latest: number | null = null
  for (const e of events) {
    const ms = new Date(e.when).getTime()
    if (Number.isNaN(ms)) continue
    if (latest === null || ms > latest) latest = ms
  }
  return latest
}

export function OneThingDetailAuditFooter({
  events,
  nowMs,
}: {
  events: AuditEvent7W1H[]
  nowMs: number
}) {
  const t = useTranslations("Dashboard.OneThing")
  const [expanded, setExpanded] = useState(false)

  if (events.length === 0) {
    return (
      <p className="text-xs text-muted-foreground/80 italic">
        {t("auditFooter.summaryNever")}
      </p>
    )
  }

  const latestMs = latestWhenMs(events)
  const ago =
    latestMs !== null && nowMs > 0
      ? ambientAgo(Math.max(0, nowMs - latestMs), t)
      : t("shell.ambientTimeJustNow")

  const summary = t("auditFooter.summary", { ago, count: events.length })

  const reversed = [...events].reverse()
  const visible = expanded ? reversed : reversed.slice(0, VISIBLE_THRESHOLD)

  return (
    <section
      aria-label={t("auditFooter.heading")}
      className="flex flex-col gap-3"
    >
      <p className="flex items-baseline gap-2 text-xs text-muted-foreground/80">
        <span>{summary}</span>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="text-muted-foreground/80 hover:text-foreground focus-visible:underline focus-visible:outline-none"
        >
          {expanded ? t("auditFooter.collapse") : t("auditFooter.expand")}
        </button>
      </p>

      {expanded ? (
        <ul className="flex flex-col gap-2.5">
          {visible.map((event, i) => (
            <li
              key={`${event.when}-${i}`}
              className="text-sm leading-relaxed text-muted-foreground"
            >
              {describeAuditEvent7W1H(event, { nowMs })}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}
