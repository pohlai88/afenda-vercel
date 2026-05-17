"use client"

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react"
import { cn } from "#lib/utils"
import { useSidebar } from "#components2/ui/sidebar"
import type { AppShellPrimaryLeftRailConfig } from "../left-rail-bar/appshell-primary-left-rail.schema"
import {
  AppShellSubNav,
  AppShellSubNavFloatingPanel,
} from "./appshell-sub-layout-left-rail.client"
import { appShellSubLayoutFloatingPanelId } from "./appshell-sub-layout-floating-panel-id.shared"

// ---------------------------------------------------------------------------
// Context — lets AppShellSurface render a panel toggle in its chrome bar
// without prop-drilling through the children tree.
// ---------------------------------------------------------------------------

export type AppShellSubLayoutFloatingContextValue = {
  open: boolean
  toggle: () => void
  close: () => void
  /** Element id for the floating panel — wire to `aria-controls` on the surface toggle. */
  panelId: string
}

export const AppShellSubLayoutFloatingContext =
  createContext<AppShellSubLayoutFloatingContextValue | null>(null)

/** Floating sub-nav state when inside `AppSubLayoutClient` expanded-primary mode; `null` otherwise. */
export function useAppShellSubLayoutFloating(): AppShellSubLayoutFloatingContextValue | null {
  return useContext(AppShellSubLayoutFloatingContext)
}

// ---------------------------------------------------------------------------
// Public component
// ---------------------------------------------------------------------------

export type AppSubLayoutProps = {
  rail?: AppShellPrimaryLeftRailConfig | null
  command?: ReactNode | null
  children: ReactNode
}

/**
 * AppSubLayoutClient — secondary nav with two modes based on primary rail state:
 *
 * | Primary rail  | Secondary nav                                               |
 * |---------------|-------------------------------------------------------------|
 * | Collapsed     | Static in-flow tree rail beside content                     |
 * | Expanded      | Floating panel toggled by PanelLeft button in surface chrome |
 * | Mobile        | Hidden                                                      |
 *
 * Floating mode: toggle button lives in AppShellSurface's sticky chrome bar
 * (before the breadcrumb). State is shared via AppShellSubLayoutFloatingContext so the
 * panel and the toggle button stay decoupled.
 */
export function AppSubLayoutClient({
  rail = null,
  command = null,
  children,
}: AppSubLayoutProps) {
  const { open: sidebarOpen } = useSidebar()
  const [floatingOpen, setFloatingOpen] = useState(false)
  const toggleFloating = useCallback(() => setFloatingOpen((p) => !p), [])
  const closeFloating = useCallback(() => setFloatingOpen(false), [])

  if (!rail) {
    return (
      <>
        {children}
        {command}
      </>
    )
  }

  const primaryCollapsed = !sidebarOpen
  const floatingPanelId = appShellSubLayoutFloatingPanelId(rail.storageKey)

  return (
    <>
      <div
        className={cn(
          "flex min-h-0 min-w-0 flex-1 overflow-hidden",
          primaryCollapsed && "md:flex-row"
        )}
      >
        {/* ── Collapsed primary → static in-flow sub rail ── */}
        {primaryCollapsed ? (
          <aside
            aria-label={rail.labels.ariaLabel}
            className={cn(
              "hidden min-h-0 shrink-0 md:flex md:flex-col",
              "w-40",
              "mt-4 mr-6 ml-4",
              "border-0 bg-transparent shadow-none ring-0"
            )}
          >
            <AppShellSubNav rail={rail} className="py-1" />
          </aside>
        ) : null}

        {/* ── Content column — relative so floating sub panel can anchor here ── */}
        <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          {!primaryCollapsed ? (
            <AppShellSubLayoutFloatingContext.Provider
              value={{
                open: floatingOpen,
                toggle: toggleFloating,
                close: closeFloating,
                panelId: floatingPanelId,
              }}
            >
              <AppShellSubNavFloatingPanel
                rail={rail}
                open={floatingOpen}
                onCloseAction={closeFloating}
              />
              {children}
            </AppShellSubLayoutFloatingContext.Provider>
          ) : (
            children
          )}
        </div>
      </div>

      {command}
    </>
  )
}
