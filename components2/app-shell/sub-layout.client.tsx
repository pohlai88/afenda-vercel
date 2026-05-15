"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react"
import { ChevronDown, ChevronRight } from "lucide-react"

import { Link } from "#i18n/navigation"
import { cn } from "#lib/utils"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "#components2/ui/collapsible"
import { useSidebar } from "../ui/sidebar"
import type {
  AppShellRailConfig,
  AppShellRailNavChildItem,
  AppShellRailNavItem,
  AppShellRailNavSection,
} from "./rail.schema"

// ---------------------------------------------------------------------------
// Context — lets AppShellSurface render a panel toggle in its chrome bar
// without prop-drilling through the children tree.
// ---------------------------------------------------------------------------

export type SubNavFloatingContextValue = {
  open: boolean
  toggle: () => void
  close: () => void
}

export const SubNavFloatingContext =
  createContext<SubNavFloatingContextValue | null>(null)

/** Returns floating sub-nav state when rendered inside AppSubLayoutClient in floating mode, null otherwise. */
export function useSubNavFloating(): SubNavFloatingContextValue | null {
  return useContext(SubNavFloatingContext)
}

// ---------------------------------------------------------------------------
// Public component
// ---------------------------------------------------------------------------

export type AppSubLayoutProps = {
  rail?: AppShellRailConfig | null
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
 * (before the breadcrumb). State is shared via SubNavFloatingContext so the
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

  return (
    <>
      <div
        className={cn(
          "flex min-h-0 min-w-0 flex-1 overflow-hidden",
          primaryCollapsed && "md:flex-row"
        )}
      >
        {/* ── Collapsed primary → static in-flow tree rail ── */}
        {primaryCollapsed ? (
          <aside
            aria-label={rail.labels.ariaLabel}
            className={cn(
              "hidden min-h-0 shrink-0 md:flex md:flex-col",
              "w-40",
              "ml-4 mr-6 mt-4",
              "bg-transparent border-0 shadow-none ring-0"
            )}
          >
            <nav className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto py-1">
              {rail.slots.nav.map((section, index) => (
                <SubNavSection
                  key={section.id}
                  section={section}
                  isFirst={index === 0}
                />
              ))}
            </nav>
          </aside>
        ) : null}

        {/* ── Content column — relative so floating panel can anchor here ── */}
        <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          {/* Expanded primary → floating panel controlled by chrome toggle */}
          {!primaryCollapsed ? (
            <SubNavFloatingContext.Provider
              value={{ open: floatingOpen, toggle: toggleFloating, close: closeFloating }}
            >
              <FloatingSubPanel
                rail={rail}
                open={floatingOpen}
                onClose={closeFloating}
              />
              {children}
            </SubNavFloatingContext.Provider>
          ) : (
            children
          )}
        </div>
      </div>

      {command}
    </>
  )
}

// ---------------------------------------------------------------------------
// Floating panel — expanded primary rail mode
// ---------------------------------------------------------------------------

function FloatingSubPanel({
  rail,
  open,
  onClose,
}: {
  rail: AppShellRailConfig
  open: boolean
  onClose: () => void
}) {
  // ESC closes the panel
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [open, onClose])

  return (
    <div
      id={`floating-subnav-${rail.storageKey}`}
      role="region"
      aria-label={rail.labels.ariaLabel}
      className={cn(
        // Starts below the sticky surface chrome (--af-l1-height) so the
        // toggle button in the chrome bar is never obscured by the panel.
        "absolute top-(--af-l1-height) bottom-0 left-0 z-20",
        "flex w-44 flex-col",
        "border-r border-border/50 bg-card/95 backdrop-blur-sm",
        "transition-all duration-200 ease-out",
        open
          ? "translate-x-0 opacity-100"
          : "pointer-events-none -translate-x-full opacity-0"
      )}
    >
      <nav className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-2 py-3">
        {rail.slots.nav.map((section, index) => (
          <SubNavSection
            key={section.id}
            section={section}
            isFirst={index === 0}
          />
        ))}
      </nav>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Shared nav tree — used by both static aside and floating panel
// ---------------------------------------------------------------------------

function SubNavSection({
  section,
  isFirst,
}: {
  section: AppShellRailNavSection
  isFirst: boolean
}) {
  return (
    <div className="flex flex-col gap-1">
      {section.label ? (
        <p
          className={cn(
            "px-1 text-[11px] font-semibold leading-4 tracking-[-0.01em]",
            "text-foreground",
            !isFirst && "mt-1"
          )}
        >
          {section.label}
        </p>
      ) : null}

      <div className="flex flex-col gap-0.5">
        {section.items.map((item) => (
          <SubNavTreeItem key={item.id} item={item} />
        ))}
      </div>
    </div>
  )
}

function SubNavTreeItem({ item }: { item: AppShellRailNavItem }) {
  const childItems = item.items
  const hasChildren = Boolean(childItems?.length)
  const [open, setOpen] = useState(hasChildren ? Boolean(item.active) : false)

  const itemClass = cn(
    "flex w-full items-center gap-1.5 rounded-md px-1 py-1",
    "text-[12px] leading-5 tracking-[-0.01em]",
    "transition-colors",
    item.active
      ? "font-medium text-foreground"
      : "font-normal text-muted-foreground hover:text-foreground"
  )

  if (!hasChildren || !childItems) {
    return (
      <Link
        href={item.href}
        aria-current={item.active ? "page" : undefined}
        prefetch={false}
        className={cn(itemClass, "pl-[22px]")}
      >
        <span className="truncate">{item.label}</span>
      </Link>
    )
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className={itemClass}>
        {open ? (
          <ChevronDown className="size-3 shrink-0 text-muted-foreground/50" />
        ) : (
          <ChevronRight className="size-3 shrink-0 text-muted-foreground/50" />
        )}
        <span className="truncate text-left">{item.label}</span>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="flex flex-col gap-0.5 pl-[22px]">
          {childItems.map((child) => (
            <SubNavChildItem key={child.id} item={child} />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

function SubNavChildItem({ item }: { item: AppShellRailNavChildItem }) {
  return (
    <Link
      href={item.href}
      aria-current={item.active ? "page" : undefined}
      prefetch={false}
      className={cn(
        "block rounded-md px-1 py-0.5",
        "text-[11.5px] leading-5 tracking-[-0.01em]",
        "transition-colors",
        item.active
          ? "font-medium text-foreground"
          : "font-normal text-muted-foreground/70 hover:text-foreground"
      )}
    >
      <span className="truncate">{item.label}</span>
    </Link>
  )
}
