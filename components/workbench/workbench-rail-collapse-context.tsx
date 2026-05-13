"use client"

import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react"

/** Stable DOM id for `WorkbenchRail` `<nav aria-labelledby / aria-controls>` wiring. */
export const WORKBENCH_RAIL_NAV_DOM_ID = "workbench-rail-nav" as const
export const DEFAULT_WORKBENCH_RAIL_STORAGE_KEY =
  "afenda.workbench.rail.collapsed" as const

export type WorkbenchRailMode = "expanded" | "collapsed" | "hover"

export type WorkbenchRailCollapseApi = {
  collapsed: boolean
  setCollapsed: (collapsed: boolean) => void
  mode: WorkbenchRailMode
  setMode: (mode: WorkbenchRailMode) => void
  toggleCollapse: () => void
  collapseLabel: string
  expandLabel: string
  /** Value for `aria-controls` on the L1 collapse control (`#${id}` on `<nav>`). */
  controlsNavId: string
}

function parseStoredWorkbenchRailMode(value: string | null): WorkbenchRailMode {
  if (value === "expanded" || value === "collapsed" || value === "hover") {
    return value
  }
  return value === "true" ? "collapsed" : "expanded"
}

export function useWorkbenchRailCollapseState(
  config: {
    storageKey?: string
    collapseLabel: string
    expandLabel: string
  } | null
): {
  railMode: WorkbenchRailMode
  railCollapseApi: WorkbenchRailCollapseApi | null
} {
  const storageKey = config?.storageKey ?? DEFAULT_WORKBENCH_RAIL_STORAGE_KEY

  const [railMode, setRailMode] = useState<WorkbenchRailMode>(() => {
    if (typeof window === "undefined") return "expanded"
    try {
      return parseStoredWorkbenchRailMode(localStorage.getItem(storageKey))
    } catch {
      return "expanded"
    }
  })

  const persistRailMode = useCallback(
    (mode: WorkbenchRailMode) => {
      try {
        localStorage.setItem(storageKey, mode)
      } catch {
        // ignore storage errors
      }
    },
    [storageKey]
  )

  const toggleRail = useCallback(() => {
    setRailMode((prev) => {
      const next: WorkbenchRailMode =
        prev === "expanded" ? "collapsed" : "expanded"
      persistRailMode(next)
      return next
    })
  }, [persistRailMode])

  const setCollapsedPersisted = useCallback(
    (collapsed: boolean) => {
      const next: WorkbenchRailMode = collapsed ? "collapsed" : "expanded"
      setRailMode(next)
      persistRailMode(next)
    },
    [persistRailMode]
  )

  const setRailModePersisted = useCallback(
    (mode: WorkbenchRailMode) => {
      setRailMode(mode)
      persistRailMode(mode)
    },
    [persistRailMode]
  )

  const railCollapseApi = useMemo<WorkbenchRailCollapseApi | null>(() => {
    if (!config) return null

    return {
      collapsed: railMode !== "expanded",
      setCollapsed: setCollapsedPersisted,
      mode: railMode,
      setMode: setRailModePersisted,
      toggleCollapse: toggleRail,
      collapseLabel: config.collapseLabel,
      expandLabel: config.expandLabel,
      controlsNavId: WORKBENCH_RAIL_NAV_DOM_ID,
    }
  }, [
    config,
    railMode,
    setCollapsedPersisted,
    setRailModePersisted,
    toggleRail,
  ])

  return { railMode, railCollapseApi }
}

const RailCollapseApiContext = createContext<WorkbenchRailCollapseApi | null>(
  null
)

const NestedRailCollapseRegistrarContext = createContext<Dispatch<
  SetStateAction<WorkbenchRailCollapseApi | null>
> | null>(null)

export function WorkbenchRailCollapseUiProvider({
  shellApi,
  children,
}: {
  shellApi: WorkbenchRailCollapseApi | null
  children: ReactNode
}) {
  const [nestedApi, setNestedApi] = useState<WorkbenchRailCollapseApi | null>(
    null
  )

  const effectiveApi = useMemo(
    () => shellApi ?? nestedApi ?? null,
    [shellApi, nestedApi]
  )

  return (
    <NestedRailCollapseRegistrarContext.Provider value={setNestedApi}>
      <RailCollapseApiContext.Provider value={effectiveApi}>
        {children}
      </RailCollapseApiContext.Provider>
    </NestedRailCollapseRegistrarContext.Provider>
  )
}

export function useWorkbenchRailCollapseApi(): WorkbenchRailCollapseApi | null {
  return useContext(RailCollapseApiContext)
}

/**
 * Transient rail width (e.g. hover-expand) can differ from persisted
 * `WorkbenchRailCollapseApi.collapsed`. `WorkbenchRail` supplies this to
 * footer chrome so labels and padding track the painted rail, not storage.
 */
const RailVisualCollapseContext = createContext<boolean | undefined>(undefined)

export function WorkbenchRailVisualCollapseProvider({
  value,
  children,
}: {
  value: boolean
  children: ReactNode
}) {
  return (
    <RailVisualCollapseContext.Provider value={value}>
      {children}
    </RailVisualCollapseContext.Provider>
  )
}

export function useWorkbenchRailVisuallyCollapsed(): boolean | undefined {
  return useContext(RailVisualCollapseContext)
}

/**
 * Registers collapse API from a nested `WorkbenchSubLayout` rail when the
 * parent shell has `rail={null}` — L1 utilities still control collapse.
 */
export function useRegisterNestedWorkbenchRailCollapse(
  api: WorkbenchRailCollapseApi | null
) {
  const setNestedApi = useContext(NestedRailCollapseRegistrarContext)

  useLayoutEffect(() => {
    if (!setNestedApi) return undefined
    if (!api) {
      setNestedApi(null)
      return undefined
    }
    setNestedApi(api)
    return () => setNestedApi(null)
  }, [api, setNestedApi])
}
