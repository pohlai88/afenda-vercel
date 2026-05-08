"use client"

import { useSyncExternalStore } from "react"
import { useTranslations } from "next-intl"

import { Link, usePathname } from "#i18n/navigation"

import type { RankedTodo } from "../data/todo-rank.shared"

/**
 * Operational tail — the next 4–6 ranked todos as a quiet, monochrome column.
 *
 * Click any item ⇒ updates the page's `?focus=…` search param so the RSC
 * re-renders with that todo as the new canvas. No tabs, no kanban, no
 * filters — the ranker is the source of truth and the tail is its preview.
 */

const HOUR_MS = 60 * 60 * 1000
const DAY_MS = 24 * HOUR_MS

function subscribeNoop(): () => void {
  return () => {}
}
function getClientNow(): number {
  return Date.now()
}
function getServerNowZero(): number {
  return 0
}

function compactHorizon(msUntil: number): string {
  const abs = Math.abs(msUntil)
  if (abs < 60_000) return "<1m"
  if (abs < HOUR_MS) return `${Math.round(abs / 60_000)}m`
  if (abs < DAY_MS) return `${Math.floor(abs / HOUR_MS)}h`
  return `${Math.floor(abs / DAY_MS)}d`
}

function tailMeta(
  todo: RankedTodo,
  now: number
): {
  text: string
  tone: "default" | "warn" | "crit"
} {
  const slaMs =
    todo.impact?.slaHorizonMs ??
    (todo.dueAt && now > 0 ? todo.dueAt.getTime() - now : null)

  if (slaMs != null) {
    if (slaMs < 0)
      return { text: `overdue · ${compactHorizon(slaMs)}`, tone: "crit" }
    if (slaMs < 4 * HOUR_MS)
      return { text: `in ${compactHorizon(slaMs)}`, tone: "crit" }
    if (slaMs < DAY_MS)
      return { text: `in ${compactHorizon(slaMs)}`, tone: "warn" }
    return { text: `in ${compactHorizon(slaMs)}`, tone: "default" }
  }
  if (todo.recurrenceRule) return { text: "recurring", tone: "default" }
  if (todo.priority === "urgent") return { text: "urgent", tone: "warn" }
  return { text: todo.state, tone: "default" }
}

function CounterPartyGlyph({ todo }: { todo: RankedTodo }) {
  if (!todo.counterparty) return null
  if (todo.counterparty.direction === "owes-you") {
    return (
      <span className="inline-flex items-center gap-1 font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
        ←
        <span className="text-foreground">
          {todo.counterparty.displayName ?? todo.counterparty.userId ?? ""}
        </span>
      </span>
    )
  }
  if (todo.counterparty.direction === "you-owe") {
    return (
      <span className="inline-flex items-center gap-1 font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
        →
        <span className="text-foreground">
          {todo.counterparty.displayName ?? todo.counterparty.userId ?? ""}
        </span>
      </span>
    )
  }
  return null
}

export function TodoTail({
  items,
  totalOpen,
  currentId,
}: {
  items: RankedTodo[]
  totalOpen: number
  currentId: string | null
}) {
  const t = useTranslations("Dashboard.Todos")
  const pathname = usePathname()
  const now = useSyncExternalStore(subscribeNoop, getClientNow, getServerNowZero)

  return (
    <aside
      aria-label={t("tailLabel")}
      className="flex flex-col rounded-xl border bg-card"
    >
      <div className="flex items-baseline justify-between border-b px-4 py-3">
        <span className="font-mono text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
          {t("tailHeading")}
        </span>
        <span className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
          {t("tailOpenCount", { count: totalOpen })}
        </span>
      </div>

      {items.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-muted-foreground">
          {t("tailEmpty")}
        </p>
      ) : (
        <ul className="flex flex-col">
          {items.map((todo, idx) => {
            const meta = tailMeta(todo, now)
            const isCurrent = currentId === todo.id
            const chips = todo.linkage?.entities?.slice(0, 2) ?? []

            return (
              <li
                key={todo.id}
                className={
                  idx === 0 ? "" : "border-t border-border/60"
                }
              >
                <Link
                  href={`${pathname}?focus=${encodeURIComponent(todo.id)}`}
                  prefetch={false}
                  scroll={false}
                  className={`relative flex flex-col gap-1.5 px-4 py-3 transition-colors hover:bg-muted/40 focus-visible:bg-muted/60 focus-visible:outline-none ${
                    isCurrent
                      ? "before:absolute before:top-3 before:bottom-3 before:left-0 before:w-0.5 before:rounded-full before:bg-primary"
                      : ""
                  }`}
                  aria-current={isCurrent ? "true" : undefined}
                >
                  <span className="line-clamp-2 text-sm font-medium text-foreground">
                    {todo.title}
                  </span>
                  {chips.length > 0 || todo.counterparty ? (
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      {chips.map((ref, i) => (
                        <span
                          key={`${ref.module}:${ref.id}:${i}`}
                          className="inline-flex items-center gap-1 rounded-sm border bg-muted/40 px-1.5 py-0.5 text-[10.5px] text-muted-foreground"
                        >
                          <span className="font-mono text-[9px] font-semibold tracking-wider text-primary">
                            {ref.module}
                          </span>
                          <span>{ref.label ?? ref.id}</span>
                        </span>
                      ))}
                      <CounterPartyGlyph todo={todo} />
                    </div>
                  ) : null}
                  <span
                    className={`font-mono text-[10px] tracking-wider uppercase ${
                      meta.tone === "crit"
                        ? "text-destructive"
                        : meta.tone === "warn"
                          ? "text-primary"
                          : "text-muted-foreground"
                    }`}
                  >
                    {meta.text}
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </aside>
  )
}
