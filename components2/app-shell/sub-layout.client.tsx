"use client"

import type { ReactNode } from "react"
import { Link } from "#i18n/navigation"
import { cn } from "#lib/utils"
import { useSidebar } from "../ui/sidebar"
import type {
  AppShellRailConfig,
  AppShellRailNavChildItem,
  AppShellRailNavItem,
  AppShellRailNavSection,
} from "./rail.schema"

export type AppSubLayoutProps = {
  rail?: AppShellRailConfig | null
  command?: ReactNode | null
  children: ReactNode
}

/**
 * AppSubLayoutClient — hover-reveal floating text navigation inside the
 * content pane.
 *
 * Position contract:
 *   • `position: fixed` avoids the sticky-vs-containing-block ambiguity that
 *     arises from SidebarInset having `position: relative`.
 *   • `top: calc(var(--af-l1-height) + 1rem)` — exactly 1 rem below the
 *     utility bar, anchored to the viewport.
 *   • `left` is derived from the sidebar state (expanded 16 rem / icon 3 rem)
 *     plus a small inset so the panel sits just inside the content left border.
 *   • `max-h: calc(100dvh - var(--af-l1-height) - 2rem)` — 1 rem at top +
 *     1 rem at bottom clearance.
 *   • The panel stays visible while the mouse is over it (own hover),
 *     and the content area hover (`group/subnav`) is the reveal trigger.
 *   • Passthrough when rail is null.
 */
export function AppSubLayoutClient({
  rail = null,
  command = null,
  children,
}: AppSubLayoutProps) {
  const { state } = useSidebar()

  if (!rail) {
    return (
      <>
        {children}
        {command}
      </>
    )
  }

  // 0.5 rem inset from the content area's left border
  const leftOffset =
    state === "expanded"
      ? "calc(var(--sidebar-width) + 0.5rem)"
      : "calc(var(--sidebar-width-icon) + 0.5rem)"

  return (
    <>
      <div className="group/subnav relative flex min-h-0 min-w-0 flex-1 overflow-hidden">
        {/*
         * Fixed overlay — viewport-anchored so it doesn't scroll with content
         * and is not clipped by SidebarInset's overflow or position context.
         */}
        <aside
          aria-label={rail.labels.ariaLabel}
          style={{
            top: "calc(var(--af-l1-height) + 1rem)",
            left: leftOffset,
          }}
          className={cn(
            "fixed z-30",
            // Reveal: group hover shows it; own hover keeps it visible
            "pointer-events-none opacity-0",
            "group-hover/subnav:pointer-events-auto group-hover/subnav:opacity-100",
            "hover:pointer-events-auto hover:opacity-100",
            "transition-opacity duration-150 ease-out",
            // Size
            "w-[7.5rem]",
            "max-h-[calc(100dvh-var(--af-l1-height)-2rem)]",
            "overflow-y-auto",
            // Appearance
            "rounded-xl bg-background",
            "border border-border/50 shadow-sm",
            // Hide on mobile (sidebar is a sheet there)
            "hidden md:flex md:flex-col"
          )}
        >
          <nav className="flex flex-col gap-3 px-2.5 py-2.5">
            {rail.slots.nav.map((section) => (
              <SubNavSection key={section.id} section={section} />
            ))}
          </nav>
        </aside>

        {/* Content pane */}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          {children}
        </div>
      </div>

      {command}
    </>
  )
}

// ---------------------------------------------------------------------------
// Text nav primitives — no icons, pure hierarchy
// ---------------------------------------------------------------------------

function SubNavSection({ section }: { section: AppShellRailNavSection }) {
  return (
    <div className="flex flex-col gap-px">
      {section.label ? (
        <p className="mb-1.5 px-1.5 pt-0.5 text-[8px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/50 select-none">
          {section.label}
        </p>
      ) : null}
      {section.items.map((item) => (
        <SubNavItem key={item.id} item={item} />
      ))}
    </div>
  )
}

function SubNavItem({ item }: { item: AppShellRailNavItem }) {
  return (
    <div className="flex flex-col gap-px">
      <Link
        href={item.href}
        aria-current={item.active ? "page" : undefined}
        prefetch={false}
        className={cn(
          "block rounded-md px-1.5 py-[4px]",
          "text-[9.5px] leading-none tracking-[0.005em] transition-colors",
          item.active
            ? "font-[540] text-foreground"
            : "font-normal text-muted-foreground/70 hover:text-foreground"
        )}
      >
        {item.label}
      </Link>
      {item.items && item.items.length > 0 ? (
        <div className="mb-0.5 flex flex-col gap-px pl-3">
          {item.items.map((child) => (
            <SubNavChildItem key={child.id} item={child} />
          ))}
        </div>
      ) : null}
    </div>
  )
}

function SubNavChildItem({ item }: { item: AppShellRailNavChildItem }) {
  return (
    <Link
      href={item.href}
      aria-current={item.active ? "page" : undefined}
      prefetch={false}
      className={cn(
        "block rounded-md px-1.5 py-[3px]",
        "text-[8.5px] leading-none tracking-[0.005em] transition-colors",
        item.active
          ? "font-[500] text-foreground"
          : "text-muted-foreground/50 hover:text-muted-foreground"
      )}
    >
      {item.label}
    </Link>
  )
}
