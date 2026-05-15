"use client"

/**
 * UI-ephemeral Zustand store for operational scope.
 *
 * Carries ONLY transient interaction state — which pill's popover is open,
 * what the user has typed in the entity search box, and which write operations
 * are still in-flight (so the pill can show a loading spinner).
 *
 * NO authoritative context here. NO localStorage persistence.
 * The resolved context comes from the server resolver on every navigation and
 * is passed as props. This store is cleared on RSC re-renders automatically
 * because the pill components re-mount with fresh resolved props.
 *
 * See ADR-0019 §2.9.
 */

import { create } from "zustand"

type OperationalScopeUiState = {
  /** Which pill's popover is currently open. Null = none. */
  openPopoverScopeType: string | null
  /** Entity search query inside the open popover. */
  searchQuery: string
  /** Set of scope types currently pending a server write (optimistic feedback). */
  pendingWrites: Set<string>
}

type OperationalScopeUiActions = {
  openPopover: (scopeType: string) => void
  closePopover: () => void
  setSearchQuery: (q: string) => void
  markPendingWrite: (scopeType: string) => void
  clearPendingWrite: (scopeType: string) => void
}

export type OperationalScopeUiStore = OperationalScopeUiState &
  OperationalScopeUiActions

export const useOperationalScopeUiStore = create<OperationalScopeUiStore>(
  (set) => ({
    openPopoverScopeType: null,
    searchQuery: "",
    pendingWrites: new Set<string>(),

    openPopover: (scopeType) =>
      set({ openPopoverScopeType: scopeType, searchQuery: "" }),

    closePopover: () => set({ openPopoverScopeType: null, searchQuery: "" }),

    setSearchQuery: (q) => set({ searchQuery: q }),

    markPendingWrite: (scopeType) =>
      set((state) => {
        const next = new Set(state.pendingWrites)
        next.add(scopeType)
        return { pendingWrites: next }
      }),

    clearPendingWrite: (scopeType) =>
      set((state) => {
        const next = new Set(state.pendingWrites)
        next.delete(scopeType)
        return { pendingWrites: next }
      }),
  })
)
