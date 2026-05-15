"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"

import {
  UTILITY_BAR_CATALOG,
  UTILITY_BAR_MAX_VISIBLE,
  type UtilityBarItemId,
} from "../app-shell/utility-bar-items"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type UtilityBarItemState = {
  id: UtilityBarItemId
  visible: boolean
  /** Rendering order — lower is further left in the bar / earlier in catalog lists. */
  order: number
}

type UtilityBarState = {
  items: UtilityBarItemState[]
}

type UtilityBarActions = {
  /** Show or hide a single item. Enforces the UTILITY_BAR_MAX_VISIBLE cap. */
  toggleItem: (id: UtilityBarItemId) => void
  /**
   * Reorder after drag-and-drop in the **marketplace** full catalog list.
   * `orderedIds` must be a permutation of every catalog item id.
   */
  reorderFullCatalog: (orderedIds: UtilityBarItemId[]) => void
  /**
   * Reorder after drag-and-drop on the **visible right rail only**.
   * Merges the new visible sequence back into global order without corrupting
   * hidden-item positions (see mergeVisibleSequenceIntoGlobalOrder).
   */
  reorderVisibleInRail: (newVisibleOrder: UtilityBarItemId[]) => void
  /** Reset to catalog defaults. */
  reset: () => void
}

export type UtilityBarStore = UtilityBarState & UtilityBarActions

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const INITIAL_ITEMS: UtilityBarItemState[] = UTILITY_BAR_CATALOG.map(
  (def) => ({
    id: def.id,
    visible: def.defaultVisible,
    order: def.defaultOrder,
  })
)

const CATALOG_IDS: UtilityBarItemId[] = UTILITY_BAR_CATALOG.map((d) => d.id)

function countVisible(items: UtilityBarItemState[]) {
  return items.filter((i) => i.visible).length
}

function isCompleteCatalogPermutation(
  orderedIds: UtilityBarItemId[]
): orderedIds is UtilityBarItemId[] {
  if (orderedIds.length !== CATALOG_IDS.length) return false
  const seen = new Set(orderedIds)
  return CATALOG_IDS.every((id) => seen.has(id))
}

/** Merge persisted rows with the live catalog so new icons ship safely. */
function mergeCatalogWithPersistedItems(
  persisted: unknown[]
): UtilityBarItemState[] {
  const prevById = new Map(
    persisted
      .filter((row): row is UtilityBarItemState => {
        if (!row || typeof row !== "object") return false
        const r = row as Record<string, unknown>
        return (
          typeof r.id === "string" &&
          typeof r.visible === "boolean" &&
          typeof r.order === "number"
        )
      })
      .map((row) => [row.id, row])
  )

  return UTILITY_BAR_CATALOG.map((def) => {
    const prev = prevById.get(def.id)
    if (prev) {
      return {
        id: def.id,
        visible: prev.visible,
        order: prev.order,
      }
    }
    return {
      id: def.id,
      visible: def.defaultVisible,
      order: def.defaultOrder,
    }
  })
}

/** Collapse sort keys to contiguous 0…n−1 after migrations or bad storage. */
function normalizeOrders(items: UtilityBarItemState[]): UtilityBarItemState[] {
  const sorted = [...items].sort((a, b) => a.order - b.order)
  return sorted.map((item, idx) => ({ ...item, order: idx }))
}

/**
 * Insert `newVisibleOrder` at the position of the first visible row in the
 * current global sequence; invisible rows keep their relative order outside
 * that block (stable for typical “visible block then hidden utilities” layouts).
 */
function mergeVisibleSequenceIntoGlobalOrder(
  items: UtilityBarItemState[],
  newVisibleOrder: UtilityBarItemId[]
): UtilityBarItemId[] {
  const sorted = [...items].sort((a, b) => a.order - b.order)
  const mergedIds: UtilityBarItemId[] = []
  let inserted = false

  for (const row of sorted) {
    if (!row.visible) {
      mergedIds.push(row.id)
      continue
    }
    if (!inserted) {
      mergedIds.push(...newVisibleOrder)
      inserted = true
    }
  }

  return mergedIds
}

// ---------------------------------------------------------------------------
// Store — persisted to localStorage
// ---------------------------------------------------------------------------

export const useUtilityBarStore = create<UtilityBarStore>()(
  persist(
    (set, get) => ({
      items: INITIAL_ITEMS,

      toggleItem: (id) => {
        const items = get().items
        const target = items.find((i) => i.id === id)
        if (!target) return

        if (!target.visible) {
          if (countVisible(items) >= UTILITY_BAR_MAX_VISIBLE - 1) return
        }

        set({
          items: items.map((i) =>
            i.id === id ? { ...i, visible: !i.visible } : i
          ),
        })
      },

      reorderFullCatalog: (orderedIds) => {
        if (!isCompleteCatalogPermutation(orderedIds)) return
        const items = get().items
        set({
          items: items.map((i) => ({
            ...i,
            order: orderedIds.indexOf(i.id),
          })),
        })
      },

      reorderVisibleInRail: (newVisibleOrder) => {
        const items = get().items
        const visibleIds = items.filter((i) => i.visible).map((i) => i.id)
        if (visibleIds.length === 0) return

        const nextSet = new Set(newVisibleOrder)
        if (
          newVisibleOrder.length !== visibleIds.length ||
          visibleIds.some((id) => !nextSet.has(id)) ||
          newVisibleOrder.some((id) => !visibleIds.includes(id))
        ) {
          return
        }

        const mergedIds = mergeVisibleSequenceIntoGlobalOrder(
          items,
          newVisibleOrder
        )

        set({
          items: items.map((i) => ({
            ...i,
            order: mergedIds.indexOf(i.id),
          })),
        })
      },

      reset: () => set({ items: INITIAL_ITEMS }),
    }),
    {
      name: "afenda-utility-bar-v1",
      partialize: (state) => ({ items: state.items }),
      merge: (persistedState, currentState) => {
        const base = currentState as UtilityBarStore
        let raw: unknown[] | undefined

        if (persistedState && typeof persistedState === "object") {
          const o = persistedState as Record<string, unknown>
          if (Array.isArray(o.items)) {
            raw = o.items as unknown[]
          } else if (
            o.state &&
            typeof o.state === "object" &&
            Array.isArray((o.state as { items?: unknown }).items)
          ) {
            raw = (o.state as { items: unknown[] }).items
          }
        }

        if (raw) {
          const merged = normalizeOrders(mergeCatalogWithPersistedItems(raw))
          return { ...base, items: merged }
        }
        return base
      },
    }
  )
)

// ---------------------------------------------------------------------------
// Derived selectors (call inside components)
// ---------------------------------------------------------------------------

/** Returns visible items sorted by order — avatar excluded. */
export function selectVisibleItems(items: UtilityBarItemState[]) {
  return items.filter((i) => i.visible).sort((a, b) => a.order - b.order)
}

/** Returns all items sorted by order for display in the catalog list. */
export function selectAllItemsOrdered(items: UtilityBarItemState[]) {
  return [...items].sort((a, b) => a.order - b.order)
}
