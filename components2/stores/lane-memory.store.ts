"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type LaneMemoryLane = "pinned" | "urgent" | "todo"

/**
 * One item stored in a lane. `href` is optional — users can add plain text
 * reminders without a link (the row renders as a non-navigable label).
 */
export type LaneMemoryItem = {
  id: string
  label: string
  href?: string
  lane: LaneMemoryLane
  /** Unix epoch ms — used for stable insertion-order rendering. */
  addedAt: number
}

type LaneMemoryState = {
  items: LaneMemoryItem[]
}

type LaneMemoryActions = {
  /**
   * Add an item to a lane. Silently no-ops when the lane is already at the
   * per-lane cap (`LANE_MEMORY_MAX`).
   */
  addItem: (input: {
    label: string
    href?: string
    lane: LaneMemoryLane
  }) => void
  removeItem: (id: string) => void
  moveLane: (id: string, lane: LaneMemoryLane) => void
}

export type LaneMemoryStore = LaneMemoryState & LaneMemoryActions

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const LANE_MEMORY_MAX = 10

export const LANE_MEMORY_LANES = [
  "pinned",
  "urgent",
  "todo",
] as const satisfies readonly LaneMemoryLane[]

const LANE_MEMORY_LANE_SET = new Set<string>(LANE_MEMORY_LANES)

export const LANE_MEMORY_LABELS: Record<LaneMemoryLane, string> = {
  pinned: "Pinned",
  urgent: "Urgent",
  todo: "Todo",
}

function isLaneMemoryItem(row: unknown): row is LaneMemoryItem {
  if (!row || typeof row !== "object") return false
  const r = row as Record<string, unknown>
  return (
    typeof r.id === "string" &&
    typeof r.label === "string" &&
    typeof r.lane === "string" &&
    LANE_MEMORY_LANE_SET.has(r.lane) &&
    typeof r.addedAt === "number" &&
    (r.href === undefined || typeof r.href === "string")
  )
}

function sanitizePersistedItems(raw: unknown): LaneMemoryItem[] {
  if (!Array.isArray(raw)) return []
  return raw.filter(isLaneMemoryItem)
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useLaneMemoryStore = create<LaneMemoryStore>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: ({ label, href, lane }) => {
        const trimmed = label.trim()
        if (!trimmed) return
        const existing = get().items
        const laneCount = existing.filter((i) => i.lane === lane).length
        if (laneCount >= LANE_MEMORY_MAX) return
        set({
          items: [
            ...existing,
            {
              id: crypto.randomUUID(),
              label: trimmed,
              href: href?.trim() || undefined,
              lane,
              addedAt: Date.now(),
            },
          ],
        })
      },

      removeItem: (id) =>
        set({ items: get().items.filter((i) => i.id !== id) }),

      moveLane: (id, lane) => {
        const items = get().items
        const item = items.find((i) => i.id === id)
        if (!item || item.lane === lane) return
        const laneCount = items.filter((i) => i.lane === lane).length
        if (laneCount >= LANE_MEMORY_MAX) return
        set({
          items: items.map((i) => (i.id === id ? { ...i, lane } : i)),
        })
      },
    }),
    {
      name: "afenda-lane-memory-v1",
      partialize: (state) => ({ items: state.items }),
      merge: (persistedState, currentState) => {
        const base = currentState as LaneMemoryStore
        if (!persistedState || typeof persistedState !== "object") {
          return base
        }
        const o = persistedState as Record<string, unknown>
        const raw = Array.isArray(o.items)
          ? o.items
          : o.state &&
              typeof o.state === "object" &&
              Array.isArray((o.state as { items?: unknown }).items)
            ? (o.state as { items: unknown[] }).items
            : undefined
        if (!raw) return base
        return { ...base, items: sanitizePersistedItems(raw) }
      },
    }
  )
)
