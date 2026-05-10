"use client"

import { useEffect, useMemo, useRef, useState, useTransition } from "react"

import {
  useOptionalLynxSummon,
  type LynxGroundingChip,
} from "#components/nexus/nexus-lynx-summon-context"

import { Textarea } from "#components/ui/textarea"

import { OneThingDetailAuditFooter, useNow } from "#features/onething/client"
import { updateIThink } from "#features/ithink/client"
import type { IThinkRow } from "../types"

import { IThinkDetailToolbar } from "./ithink-detail-toolbar"

type IThinkDetailPanelProps = {
  row: IThinkRow
}

const STATE_LABELS: Record<string, string> = {
  detected: "Detected",
  owned: "Owned",
  blocked: "Blocked",
  resolving: "Resolving",
  ready_to_release: "Ready to release",
  released: "Released",
  resolved: "Resolved",
  deprecated: "Deprecated",
}

const SEVERITY_LABELS: Record<string, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
}

function formatDate(d: Date | null): string {
  if (!d) return "—"
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

function toDateInputValue(d: Date | null): string {
  if (!d) return ""
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

export function IThinkDetailPanel({ row }: IThinkDetailPanelProps) {
  const [isPending, startTransition] = useTransition()
  const titleRef = useRef<HTMLTextAreaElement>(null)
  const consequenceRef = useRef<HTMLTextAreaElement>(null)
  const nowMs = useNow()

  const [titleDraft, setTitleDraft] = useState(row.title)
  const [consequenceDraft, setConsequenceDraft] = useState(
    row.consequence ?? ""
  )
  const [dueInput, setDueInput] = useState(() => toDateInputValue(row.dueAt))

  const auditEvents = useMemo(() => row.audit7w1h ?? [], [row.audit7w1h])

  const setGrounding = useOptionalLynxSummon()?.setGrounding
  const groundingSignature = useMemo(
    () =>
      JSON.stringify({
        id: row.id,
        title: row.title,
        summary: row.consequence ?? null,
        entities: (row.linkage?.entities ?? []).slice(0, 3),
      }),
    [row]
  )

  useEffect(() => {
    if (!setGrounding) return
    const chips: LynxGroundingChip[] = (row.linkage?.entities ?? [])
      .slice(0, 3)
      .map((ref) => ({
        module: ref.module,
        label: ref.label ?? ref.id,
        meta: ref.meta,
      }))
    setGrounding({
      source: "onething",
      id: row.id,
      title: row.title,
      summary: row.consequence ?? null,
      chips,
    })
    return () => {
      setGrounding(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- signature pins Lynx identity
  }, [setGrounding, groundingSignature])

  function saveField(field: "title" | "consequence", value: string) {
    const trimmed = value.trim()
    if (!trimmed) return
    if (field === "title" && trimmed === row.title) return
    if (field === "consequence" && trimmed === (row.consequence ?? "")) return

    startTransition(async () => {
      const fd = new FormData()
      fd.set("oneThingId", row.id)
      fd.set(field, trimmed)
      await updateIThink(fd)
    })
  }

  function saveDueFromInput(isoDate: string) {
    startTransition(async () => {
      const fd = new FormData()
      fd.set("oneThingId", row.id)
      fd.set("dueAt", isoDate === "" ? "" : isoDate)
      await updateIThink(fd)
    })
  }

  const isTerminal = row.state === "resolved" || row.state === "deprecated"

  return (
    <div className="flex flex-col gap-4">
      <div className="space-y-1">
        <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
          Title
        </p>
        {isTerminal ? (
          <p className="text-sm text-foreground">{row.title}</p>
        ) : (
          <Textarea
            ref={titleRef}
            value={titleDraft}
            onChange={(e) => setTitleDraft(e.target.value)}
            onBlur={() => saveField("title", titleDraft)}
            rows={2}
            disabled={isPending}
            aria-label="Task title"
            className="resize-none border-border bg-background text-sm"
          />
        )}
      </div>

      <div className="space-y-1">
        <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
          Consequence
        </p>
        {isTerminal ? (
          <p className="text-xs text-muted-foreground">
            {row.consequence || "—"}
          </p>
        ) : (
          <Textarea
            ref={consequenceRef}
            value={consequenceDraft}
            onChange={(e) => setConsequenceDraft(e.target.value)}
            onBlur={() => saveField("consequence", consequenceDraft)}
            rows={3}
            disabled={isPending}
            placeholder="Describe what happens if this is ignored…"
            aria-label="Consequence"
            className="resize-none border-border bg-background text-xs"
          />
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="space-y-0.5">
          <p className="font-medium tracking-wide text-muted-foreground uppercase">
            State
          </p>
          <p className="text-foreground">
            {STATE_LABELS[row.state] ?? row.state}
          </p>
        </div>
        <div className="space-y-0.5">
          <p className="font-medium tracking-wide text-muted-foreground uppercase">
            Severity
          </p>
          <p className="text-foreground">
            {SEVERITY_LABELS[row.severity ?? ""] ?? row.severity ?? "—"}
          </p>
        </div>
        <div className="space-y-0.5 sm:col-span-2">
          <p className="font-medium tracking-wide text-muted-foreground uppercase">
            Due
          </p>
          {isTerminal ? (
            <p className="text-foreground">{formatDate(row.dueAt)}</p>
          ) : (
            <input
              type="date"
              className="mt-0.5 h-8 w-full max-w-[200px] rounded-md border border-border bg-background px-2 text-foreground"
              value={dueInput}
              disabled={isPending}
              aria-label="Due date"
              onChange={(e) => setDueInput(e.target.value)}
              onBlur={() => {
                const next = dueInput.trim()
                const prev = toDateInputValue(row.dueAt)
                if (next === prev) return
                saveDueFromInput(next)
              }}
            />
          )}
        </div>
        <div className="space-y-0.5">
          <p className="font-medium tracking-wide text-muted-foreground uppercase">
            Created
          </p>
          <p className="text-foreground">{formatDate(row.createdAt)}</p>
        </div>
      </div>

      {row.resolutionNote ? (
        <div className="space-y-0.5 rounded-md border border-border bg-muted/20 p-3">
          <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
            Resolution note
          </p>
          <p className="text-xs text-foreground">{row.resolutionNote}</p>
        </div>
      ) : null}

      <div className="pt-1">
        <IThinkDetailToolbar row={row} />
      </div>

      <section
        data-slot="subtasks"
        className="rounded-md border border-dashed border-border/50 p-3 text-xs text-muted-foreground"
        aria-label="Sub-tasks"
      >
        Open the task permalink to view sub-tasks.
      </section>
      <section
        data-slot="comments"
        className="rounded-md border border-dashed border-border/50 p-3 text-xs text-muted-foreground"
        aria-label="Comments"
      >
        Open the task permalink to view comments.
      </section>
      <section
        data-slot="attachments"
        className="rounded-md border border-dashed border-border/50 p-3 text-xs text-muted-foreground"
        aria-label="Attachments"
      >
        Open the task permalink to view attachments.
      </section>

      <div className="border-t border-border/30 pt-3">
        <OneThingDetailAuditFooter events={auditEvents} nowMs={nowMs} />
      </div>
    </div>
  )
}
