"use client"

import { useCallback, useEffect, useState } from "react"
import { Database, RefreshCw, Trash2, X } from "lucide-react"

import { cn } from "#lib/utils"
import { uiRadius, uiSurfaceElevation } from "#lib/design-system"

import { Button } from "../ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip"
import { APP_SHELL_UTILITY_L2_ICON_CLASS } from "./utility-bar.client"

// ---------------------------------------------------------------------------
// Types + helpers
// ---------------------------------------------------------------------------

type StorageStore = "localStorage" | "sessionStorage"

type StorageEntry = {
  key: string
  raw: string
  isJson: boolean
}

function getStorage(target: StorageStore): Storage {
  return target === "localStorage" ? window.localStorage : window.sessionStorage
}

function storageAvailable(target: StorageStore): boolean {
  if (typeof window === "undefined") return false
  try {
    const s = getStorage(target)
    const k = "__afenda_storage_test__"
    s.setItem(k, k)
    s.removeItem(k)
    return true
  } catch {
    return false
  }
}

function readEntries(store: Storage): StorageEntry[] {
  return Array.from({ length: store.length }, (_, i) => {
    const key = store.key(i)
    if (key == null) {
      return { key: "", raw: "", isJson: false }
    }
    const raw = store.getItem(key) ?? ""
    let isJson = false
    try {
      JSON.parse(raw)
      isJson = true
    } catch {
      isJson = false
    }
    return { key, raw, isJson }
  }).filter((e) => e.key.length > 0)
}

const VALUE_PREVIEW_LEN = 56

function truncateValue(raw: string) {
  if (raw.length <= VALUE_PREVIEW_LEN) return raw
  return `${raw.slice(0, VALUE_PREVIEW_LEN)}…`
}

// ---------------------------------------------------------------------------

/** Right-rail localStorage / sessionStorage inspector — DropdownMenu pattern. */
export function UtilityBarStoragePanel() {
  const [open, setOpen] = useState(false)
  const [activeStore, setActiveStore] = useState<StorageStore>("localStorage")
  const [availability, setAvailability] = useState<{
    localStorage: boolean
    sessionStorage: boolean
  }>({ localStorage: false, sessionStorage: false })
  const [entries, setEntries] = useState<StorageEntry[]>([])

  const syncFromBrowser = useCallback(() => {
    if (typeof window === "undefined") return
    if (!storageAvailable(activeStore)) {
      setEntries([])
      return
    }
    setEntries(readEntries(getStorage(activeStore)))
  }, [activeStore])

  useEffect(() => {
    if (typeof window === "undefined") return
    const handle = window.setTimeout(() => {
      setAvailability({
        localStorage: storageAvailable("localStorage"),
        sessionStorage: storageAvailable("sessionStorage"),
      })
    }, 0)
    return () => window.clearTimeout(handle)
  }, [])

  useEffect(() => {
    const handle = window.setTimeout(() => syncFromBrowser(), 0)
    return () => window.clearTimeout(handle)
  }, [activeStore, syncFromBrowser])

  useEffect(() => {
    if (!open) return
    const handle = window.setTimeout(() => syncFromBrowser(), 0)
    return () => window.clearTimeout(handle)
  }, [open, syncFromBrowser])

  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (
        activeStore === "localStorage" &&
        e.storageArea === window.localStorage
      ) {
        syncFromBrowser()
      }
      if (
        activeStore === "sessionStorage" &&
        e.storageArea === window.sessionStorage
      ) {
        syncFromBrowser()
      }
    }
    window.addEventListener("storage", onStorage)
    return () => window.removeEventListener("storage", onStorage)
  }, [activeStore, syncFromBrowser])

  const currentAvailable =
    activeStore === "localStorage"
      ? availability.localStorage
      : availability.sessionStorage

  function removeKey(key: string) {
    if (typeof window === "undefined" || !currentAvailable) return
    try {
      getStorage(activeStore).removeItem(key)
      syncFromBrowser()
    } catch {
      // Quota or access errors — list refresh reflects state.
      syncFromBrowser()
    }
  }

  function clearAll() {
    if (typeof window === "undefined" || !currentAvailable) return
    if (
      !window.confirm(
        `Clear all keys in ${activeStore === "localStorage" ? "local" : "session"} storage for this origin?`
      )
    ) {
      return
    }
    try {
      getStorage(activeStore).clear()
      syncFromBrowser()
    } catch {
      syncFromBrowser()
    }
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Storage inspector"
              className={cn(
                APP_SHELL_UTILITY_L2_ICON_CLASS,
                "data-[state=open]:bg-muted/55 data-[state=open]:text-foreground"
              )}
            >
              <span
                aria-hidden
                className="size-[15px] shrink-0 [&>svg]:size-full"
              >
                <Database strokeWidth={2} />
              </span>
            </button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom" align="center" sideOffset={8}>
          Storage inspector
        </TooltipContent>
      </Tooltip>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className={cn(
          "w-80 p-0",
          "border border-border bg-card/95 text-card-foreground backdrop-blur-sm",
          uiRadius.popover,
          uiSurfaceElevation.raised,
          "ring-0 ring-offset-0"
        )}
      >
        <div className="shrink-0 border-b border-border/50 px-4 py-3">
          <p className="text-xs font-semibold tracking-tight text-card-foreground">
            Storage inspector
          </p>
          <p className="mt-0.5 text-[10px] text-muted-foreground">
            Browser storage for this origin (dev tools style).
          </p>
        </div>

        <div className="flex gap-1 border-b border-border/50 px-3 py-2">
          {(["localStorage", "sessionStorage"] as const).map((id) => {
            const label = id === "localStorage" ? "local" : "session"
            const ok =
              id === "localStorage"
                ? availability.localStorage
                : availability.sessionStorage
            return (
              <Button
                key={id}
                type="button"
                variant={activeStore === id ? "secondary" : "ghost"}
                size="sm"
                className="h-7 flex-1 text-[10px] font-medium"
                disabled={!ok}
                onPointerDown={(e) => e.preventDefault()}
                onClick={() => setActiveStore(id)}
              >
                {label}
                {!ok ? " (blocked)" : null}
              </Button>
            )
          })}
        </div>

        {!currentAvailable ? (
          <div className="px-4 py-4">
            <p className="text-[11px] text-muted-foreground">
              This storage backend is not available (private mode, policy, or
              quota). Try the other tab or a normal window.
            </p>
          </div>
        ) : (
          <>
            <div className="max-h-48 overflow-y-auto px-2 py-2">
              {entries.length === 0 ? (
                <p className="px-2 py-6 text-center text-[11px] text-muted-foreground">
                  No entries
                </p>
              ) : (
                <ul className="space-y-1">
                  {entries.map((row) => (
                    <li
                      key={row.key}
                      className="rounded-md border border-border/40 bg-muted/10 px-2 py-1.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-mono text-[10px] font-medium text-foreground">
                            {row.key}
                          </p>
                          <p className="mt-0.5 font-mono text-[9px] leading-snug break-all text-muted-foreground">
                            {truncateValue(row.raw)}
                          </p>
                          {row.isJson ? (
                            <span className="mt-1 inline-block rounded bg-muted px-1 py-0.5 text-[8px] font-semibold tracking-wide text-muted-foreground uppercase">
                              JSON
                            </span>
                          ) : null}
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-7 shrink-0 text-muted-foreground hover:text-destructive"
                          aria-label={`Remove ${row.key}`}
                          onPointerDown={(e) => e.preventDefault()}
                          onClick={() => removeKey(row.key)}
                        >
                          <X className="size-3.5" strokeWidth={2} aria-hidden />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <DropdownMenuSeparator className="my-0" />

            <div className="flex items-center justify-between gap-2 px-3 py-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 text-[11px]"
                onPointerDown={(e) => e.preventDefault()}
                onClick={() => syncFromBrowser()}
              >
                <RefreshCw
                  className="mr-1.5 size-3.5"
                  strokeWidth={2}
                  aria-hidden
                />
                Refresh
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 text-[11px] text-destructive hover:bg-destructive/10 hover:text-destructive"
                disabled={entries.length === 0}
                onPointerDown={(e) => e.preventDefault()}
                onClick={clearAll}
              >
                <Trash2
                  className="mr-1.5 size-3.5"
                  strokeWidth={2}
                  aria-hidden
                />
                Clear all
              </Button>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
