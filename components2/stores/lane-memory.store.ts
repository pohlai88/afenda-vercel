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

      moveLane: (id, lane) =>
        set({
          items: get().items.map((i) =>
            i.id === id ? { ...i, lane } : i
          ),
        }),
    }),
    { name: "afenda-lane-memory-v1" }
  )
)
