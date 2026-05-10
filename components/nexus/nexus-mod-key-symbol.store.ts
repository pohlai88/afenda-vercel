"use client"

import { useSyncExternalStore } from "react"

let modSymbol: "⌘" | "Ctrl" = "Ctrl"
const listeners = new Set<() => void>()

function resolveModSymbol(): "⌘" | "Ctrl" {
  if (typeof navigator === "undefined") return "Ctrl"
  return /Mac|iPhone|iPad|iPod/i.test(navigator.userAgent) ? "⌘" : "Ctrl"
}

function subscribe(onStoreChange: () => void) {
  listeners.add(onStoreChange)
  queueMicrotask(() => {
    const next = resolveModSymbol()
    if (next !== modSymbol) {
      modSymbol = next
      for (const cb of listeners) {
        cb()
      }
    }
  })
  return () => {
    listeners.delete(onStoreChange)
  }
}

function getSnapshot() {
  return modSymbol
}

/** Static SSR / hydration snapshot — must match initial {@link modSymbol} on the client. */
function getServerSnapshot() {
  return "Ctrl"
}

/**
 * Modifier key glyph for shortcut cheatsheets (⌘ on Apple platforms, Ctrl elsewhere).
 */
export function useModKeySymbol() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
