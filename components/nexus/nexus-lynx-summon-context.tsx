"use client"

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react"

/**
 * Lightweight client context that lets feature components register the
 * "currently open" entity so the floating Lynx summon drawer can ground its feed.
 *
 * The provider lives once in the Workbench shell. Features (e.g. Orbit item
 * detail panels) call `setGrounding(...)` in an effect when they mount or the
 * open atom changes, and clear it on unmount. Outside the shell the optional
 * hook returns `null` so callers don't crash on routes that do not mount it.
 */

export type LynxGroundingChip = {
  /** Short module/source tag, e.g. "PLANNER", "PO", "CONTACT". */
  module: string
  /** Human-readable label (entity name or short description). */
  label: string
  /** Optional secondary line, rendered after a separator. */
  meta?: string
}

export type LynxGrounding = {
  /** Where the grounding came from — used as a hint for the drawer copy. */
  source: "planner_item" | "planner_signal" | "contact" | "run" | "page"
  /** Stable identifier (entity id, or a synthetic page id when source = "page"). */
  id: string
  /** Display title, e.g. the open planner item title. */
  title: string
  /** Optional one-line summary; falls back to chips when absent. */
  summary?: string | null
  /**
   * Operational consequence statement — when present, the drawer can render
   * this as the grounding's "why this matters" line instead of a generic
   * summary.
   */
  consequence?: string | null
  /**
   * What breaks if the focused atom is ignored. When present, the drawer can
   * render this as the grounding's "if not resolved" line.
   */
  failureConsequence?: string | null
  /** Optional linkage chips (max 3 rendered in the drawer header). */
  chips?: LynxGroundingChip[]
}

type LynxSummonContextValue = {
  grounding: LynxGrounding | null
  setGrounding: (grounding: LynxGrounding | null) => void
  open: boolean
  openSummon: () => void
  closeSummon: () => void
  toggleSummon: () => void
}

const LynxSummonContext = createContext<LynxSummonContextValue | null>(null)

function groundingPayloadEqual(
  a: LynxGrounding | null,
  b: LynxGrounding | null
): boolean {
  if (Object.is(a, b)) return true
  if (a === null || b === null) return a === b
  if (a.source !== b.source || a.id !== b.id || a.title !== b.title)
    return false
  if ((a.summary ?? null) !== (b.summary ?? null)) return false
  if ((a.consequence ?? null) !== (b.consequence ?? null)) return false
  if ((a.failureConsequence ?? null) !== (b.failureConsequence ?? null))
    return false
  return JSON.stringify(a.chips ?? []) === JSON.stringify(b.chips ?? [])
}

export function LynxSummonProvider({ children }: { children: ReactNode }) {
  const [grounding, setGroundingState] = useState<LynxGrounding | null>(null)
  const [open, setOpen] = useState(false)

  const setGrounding = useCallback((next: LynxGrounding | null) => {
    setGroundingState((prev) =>
      groundingPayloadEqual(prev, next) ? prev : next
    )
  }, [])

  const openSummon = useCallback(() => setOpen(true), [])
  const closeSummon = useCallback(() => setOpen(false), [])
  const toggleSummon = useCallback(() => setOpen((v) => !v), [])

  const value = useMemo<LynxSummonContextValue>(
    () => ({
      grounding,
      setGrounding,
      open,
      openSummon,
      closeSummon,
      toggleSummon,
    }),
    [grounding, setGrounding, open, openSummon, closeSummon, toggleSummon]
  )

  return (
    <LynxSummonContext.Provider value={value}>
      {children}
    </LynxSummonContext.Provider>
  )
}

/**
 * Required hook — throws when used outside `LynxSummonProvider`. Use this for
 * the floating button + drawer themselves.
 */
export function useLynxSummon(): LynxSummonContextValue {
  const ctx = useContext(LynxSummonContext)
  if (!ctx) {
    throw new Error("useLynxSummon must be used within a LynxSummonProvider")
  }
  return ctx
}

/**
 * Optional hook — returns `null` outside the provider. Feature components use
 * this so they keep working on routes that don't mount the Workbench shell.
 */
export function useOptionalLynxSummon(): LynxSummonContextValue | null {
  return useContext(LynxSummonContext)
}
