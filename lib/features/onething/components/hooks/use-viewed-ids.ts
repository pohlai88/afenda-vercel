"use client"

import { useCallback, useMemo, useSyncExternalStore } from "react"

/**
 * Per-device "I've already seen this row" memory, used to drop the title
 * opacity in the list pane after focus.
 *
 * Storage: a single LRU-capped JSON array under `afenda:onething:viewed`.
 * The cap (200) prevents quota growth; ordering is insertion-time.
 *
 * Why `useSyncExternalStore`:
 *
 * - It is React's intended primitive for "subscribe to an external store
 *   with no SSR hydration mismatch." `getServerSnapshot` returns the
 *   empty string on the server; `getSnapshot` reads the raw JSON string
 *   on the client; the storage event keeps multiple tabs in sync.
 * - It avoids the `useEffect`-then-`setState` round trip used by ad hoc
 *   localStorage hooks, which produces a brief "everything is unviewed"
 *   flash on first paint.
 *
 * The hook returns `{ viewed, markViewed, clearAll }`. `viewed` is a
 * `ReadonlySet<string>` parsed once per snapshot string change.
 *
 * Multi-tab: native `storage` events fire only on OTHER tabs that did not
 * write the value. To keep this tab consistent with its own writes, every
 * mutation dispatches a synthetic `storage` event so subscribers in this
 * tab also re-read.
 */

const STORAGE_KEY = "afenda:onething:viewed"
const LRU_CAP = 200
const EMPTY_SNAPSHOT = ""

function readRaw(): string {
  if (typeof window === "undefined") return EMPTY_SNAPSHOT
  try {
    return window.localStorage.getItem(STORAGE_KEY) ?? EMPTY_SNAPSHOT
  } catch {
    return EMPTY_SNAPSHOT
  }
}

function parseSnapshot(raw: string): ReadonlySet<string> {
  if (raw === EMPTY_SNAPSHOT) return new Set()
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return new Set()
    return new Set(parsed.filter((x): x is string => typeof x === "string"))
  } catch {
    return new Set()
  }
}

function getSnapshot(): string {
  return readRaw()
}

function getServerSnapshot(): string {
  return EMPTY_SNAPSHOT
}

function subscribe(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => {}
  function onStorage(e: StorageEvent) {
    if (e.key !== null && e.key !== STORAGE_KEY) return
    onChange()
  }
  window.addEventListener("storage", onStorage)
  return () => {
    window.removeEventListener("storage", onStorage)
  }
}

function writeIds(next: ReadonlySet<string>): void {
  if (typeof window === "undefined") return
  try {
    if (next.size === 0) {
      window.localStorage.removeItem(STORAGE_KEY)
    } else {
      const arr = Array.from(next).slice(-LRU_CAP)
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(arr))
    }
    // Synthesize so subscribers in THIS tab also re-read; native storage
    // events skip the originating tab.
    window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY }))
  } catch {
    // best effort — quota / disabled storage / private mode
  }
}

export function useViewedIds(): {
  viewed: ReadonlySet<string>
  markViewed: (id: string) => void
  clearAll: () => void
} {
  const snapshot = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  )
  const viewed = useMemo(() => parseSnapshot(snapshot), [snapshot])

  const markViewed = useCallback(
    (id: string) => {
      if (viewed.has(id)) return
      const next = new Set(viewed)
      next.add(id)
      writeIds(next)
    },
    [viewed]
  )

  const clearAll = useCallback(() => {
    if (viewed.size === 0) return
    writeIds(new Set())
  }, [viewed])

  return { viewed, markViewed, clearAll }
}
