"use client"

import {
  createContext,
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

export type WorkbenchRailCollapseApi = {
  collapsed: boolean
  toggleCollapse: () => void
  collapseLabel: string
  expandLabel: string
  /** Value for `aria-controls` on the L1 collapse control (`#${id}` on `<nav>`). */
  controlsNavId: string
}

const RailCollapseApiContext = createContext<WorkbenchRailCollapseApi | null>(
  null
)

const NestedRailCollapseRegistrarContext =
  createContext<Dispatch<
    SetStateAction<WorkbenchRailCollapseApi | null>
  > | null>(null)

export function WorkbenchRailCollapseUiProvider({
  shellApi,
  children,
}: {
  shellApi: WorkbenchRailCollapseApi | null
  children: ReactNode
}) {
  const [nestedApi, setNestedApi] =
    useState<WorkbenchRailCollapseApi | null>(null)

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
