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
 * "currently open" entity so the floating Lynx drawer can ground its feed.
 *
 * The provider lives once in the dashboard shell. Features (e.g. todo canvas)
 * call `setGrounding(...)` in an effect when they mount or the open atom
 * changes, and clear it on unmount. Outside the dashboard shell the optional
 * hook returns `null` so callers don't crash on the personal account routes.
 */

export type LynxGroundingChip = {
  /** Short module/source tag, e.g. "TODO", "PO", "CONTACT". */
  module: string
  /** Human-readable label (entity name or short description). */
  label: string
  /** Optional secondary line, rendered after a separator. */
  meta?: string
}

export type LynxGrounding = {
  /** Where the grounding came from — used as a hint for the drawer copy. */
  source: "todo" | "contact" | "run" | "page"
  /** Stable identifier (entity id, or a synthetic page id when source = "page"). */
  id: string
  /** Display title, e.g. the open todo title. */
  title: string
  /** Optional one-line summary; falls back to chips when absent. */
  summary?: string | null
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

export function LynxSummonProvider({ children }: { children: ReactNode }) {
  const [grounding, setGroundingState] = useState<LynxGrounding | null>(null)
  const [open, setOpen] = useState(false)

  const setGrounding = useCallback((next: LynxGrounding | null) => {
    setGroundingState(next)
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
 * Optional hook — returns `null` outside the provider. Feature components
 * (e.g. `TodoCanvas`) use this so they keep working on routes that don't
 * mount the dashboard shell (e.g. personal account todos).
 */
export function useOptionalLynxSummon(): LynxSummonContextValue | null {
  return useContext(LynxSummonContext)
}
