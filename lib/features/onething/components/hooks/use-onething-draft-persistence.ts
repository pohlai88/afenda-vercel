"use client"

import { useCallback, useEffect, useRef, useState } from "react"

/**
 * Composer draft persistence — the operator's words must survive a network
 * drop, a browser crash, or a multi-tab keystroke. Persisted as a single
 * scope+listId-keyed string in `localStorage`; cleared only when the create
 * Server Action returns success.
 *
 * Multi-tab safety: storage events sync the in-memory mirror so the user
 * never sees a stale draft after typing in another tab.
 *
 * The hook intentionally avoids IndexedDB — drafts are short, single-line
 * captures, and the synchronous read at mount eliminates a flash of empty.
 */

const STORAGE_PREFIX = "afenda:onething:composer:"
const SAVE_DEBOUNCE_MS = 240

function buildKey(scope: "org" | "personal", listId: string): string {
  return `${STORAGE_PREFIX}${scope}:${listId}`
}

function readLocal(key: string): string {
  if (typeof window === "undefined") return ""
  try {
    return window.localStorage.getItem(key) ?? ""
  } catch {
    return ""
  }
}

export function useOneThingDraftPersistence(options: {
  scope: "org" | "personal"
  listId: string
}): {
  initialDraft: string
  draft: string
  setDraft: (next: string) => void
  clearDraft: () => void
} {
  const { scope, listId } = options
  const key = buildKey(scope, listId)

  const [initialDraft] = useState(() => readLocal(key))
  const [draft, setDraftState] = useState(initialDraft)

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const latestRef = useRef(draft)

  // Mirror the latest draft into the ref so unmount-time flush + multi-tab
  // listeners read the freshest value without re-binding the closure.
  useEffect(() => {
    latestRef.current = draft
  }, [draft])

  const writeNow = useCallback(
    (value: string) => {
      if (typeof window === "undefined") return
      try {
        if (value === "") window.localStorage.removeItem(key)
        else window.localStorage.setItem(key, value)
      } catch {
        // best effort — quota / disabled storage
      }
    },
    [key]
  )

  const setDraft = useCallback(
    (next: string) => {
      setDraftState(next)
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
      saveTimeoutRef.current = setTimeout(() => {
        writeNow(next)
      }, SAVE_DEBOUNCE_MS)
    },
    [writeNow]
  )

  const clearDraft = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
      saveTimeoutRef.current = null
    }
    setDraftState("")
    writeNow("")
  }, [writeNow])

  // Multi-tab sync — listen for the same key in other tabs and mirror.
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key !== key) return
      const incoming = e.newValue ?? ""
      if (incoming !== latestRef.current) setDraftState(incoming)
    }
    window.addEventListener("storage", onStorage)
    return () => {
      window.removeEventListener("storage", onStorage)
    }
  }, [key])

  // Flush pending debounce on unmount.
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
        writeNow(latestRef.current)
      }
    }
  }, [writeNow])

  return { initialDraft, draft, setDraft, clearDraft }
}
