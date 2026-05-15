"use client"

import type { ReactNode } from "react"
import type { LucideIcon } from "lucide-react"
import type { Route } from "next"

import { Link } from "#i18n/navigation"
import { uiRadius, uiSurfaceElevation, uiTracking } from "#lib/design-system"
import { cn } from "#lib/utils"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip"

import { APP_SHELL_UTILITY_L2_ICON_CLASS } from "./utility-bar.client"

// ---------------------------------------------------------------------------
// Typography — one scale for header, rows, and footer (L1 > L2 > L3)
// ---------------------------------------------------------------------------

/** L1 — panel title (header strip). */
const utilityDropdownTitleClass =
  "text-xs font-semibold tracking-tight text-card-foreground"

/** L2a — primary row label (menu actions). */
const utilityDropdownActionClass = cn(
  "text-xs font-medium leading-snug text-card-foreground",
  uiTracking.control
)

/** L2b — supporting copy: header subtitle + row descriptions. */
const utilityDropdownMetaClass = cn(
  "text-[11px] leading-snug text-muted-foreground",
  uiTracking.control
)

/** L3 — footer footnote (smallest; matches dev panel footnote density). */
const utilityDropdownFootnoteClass = cn(
  "text-[0.625rem] leading-snug text-muted-foreground",
  uiTracking.control
)

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type UtilityDropdownItem = {
  id: string
  label: string
  description?: string
  icon?: LucideIcon
  onSelect?: () => void
  href?: Route
  disabled?: boolean
}

export type UtilityDropdownGroup = {
  items: UtilityDropdownItem[]
}

export type AppShellUtilityDropdownProps = {
  groups: UtilityDropdownGroup[]
  /** Accessible name for the default round trigger (ignored when `trigger` is passed). */
  ariaLabel: string
  /** Tooltip for the default round trigger (ignored when `trigger` is passed). */
  tooltip: string
  /**
   * Icon markup inside the standard L2 round trigger.
   * Ignored when `trigger` is set.
   */
  triggerIcon?: ReactNode
  /**
   * Custom menu anchor. Must be a single element that works with
   * `DropdownMenuTrigger asChild` (e.g. `<button type="button" />`).
   * When set, `triggerIcon` is ignored; **caller must supply** `aria-label` (and
   * optional `title` for hover) on that node. `ariaLabel` / `tooltip` here stay
   * required for API stability but are not wired to the built-in tooltip ring —
   * keep them aligned with the custom control for consistency and future refactors.
   */
  trigger?: ReactNode
  /**
   * Panel title — same hierarchy as {@link components/dev/dev-signin-panel.tsx}
   * title row (enterprise shell).
   */
  title?: string
  /** Optional one-line context under the title (muted, compact). */
  subtitle?: string
  /**
   * Footer region — inset top rule + compact muted copy (dev panel footnote pattern).
   */
  footer?: ReactNode
  align?: "start" | "center" | "end"
  sideOffset?: number
  /** Extra classes on DropdownMenuContent. Default max height is `min(92vh, 40rem)`. */
  contentClassName?: string
}

// ---------------------------------------------------------------------------
// Row chrome — aligned with dev sign-in list rows (border + hover lift)
// ---------------------------------------------------------------------------

function utilityDropdownItemClass(disabled: boolean) {
  return cn(
    "flex min-w-0 w-full max-w-full cursor-default items-start gap-2.5",
    "border border-transparent px-2.5 py-3 transition-colors",
    uiRadius.control,
    "text-left text-xs outline-none select-none",
    "focus-visible:bg-accent focus-visible:text-accent-foreground",
    !disabled &&
      "hover:border-border hover:bg-accent data-[highlighted]:border-border data-[highlighted]:bg-accent",
    disabled && "opacity-50 hover:border-transparent hover:bg-transparent"
  )
}

// ---------------------------------------------------------------------------
// AppShellUtilityDropdown — enterprise utility surface (dev-panel lineage)
// ---------------------------------------------------------------------------

/**
 * Reusable DropdownMenu for utility-bar icon triggers.
 * Optional `title` / `subtitle` / `footer` match the dev panel shell: card surface,
 * clear header hierarchy, list hover affordance, footnote-style footer.
 */
export function AppShellUtilityDropdown({
  groups,
  ariaLabel,
  tooltip,
  triggerIcon,
  trigger,
  title,
  subtitle,
  footer,
  align = "end",
  sideOffset = 8,
  contentClassName,
}: AppShellUtilityDropdownProps) {
  const nonEmpty = groups.filter((g) => g.items.length > 0)
  const showHeader = Boolean(title?.trim() || subtitle?.trim())

  return (
    <DropdownMenu>
      {trigger ? (
        <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      ) : (
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label={ariaLabel}
                className={APP_SHELL_UTILITY_L2_ICON_CLASS}
              >
                {triggerIcon}
              </button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="bottom" align="center" sideOffset={8}>
            {tooltip}
          </TooltipContent>
        </Tooltip>
      )}
      <DropdownMenuContent
        align={align}
        sideOffset={sideOffset}
        className={cn(
          "flex max-h-[min(92vh,40rem)] w-[min(20rem,calc(100vw-2rem))] min-w-0 flex-col overflow-hidden p-0 gap-0",
          "border border-border bg-card/95 text-card-foreground backdrop-blur-sm",
          uiRadius.popover,
          uiSurfaceElevation.raised,
          "ring-0 ring-offset-0",
          contentClassName
        )}
      >
        {showHeader ? (
          <div className="shrink-0 border-b border-border/50 px-4 py-3">
            {title?.trim() ? (
              <p className={utilityDropdownTitleClass}>{title.trim()}</p>
            ) : null}
            {subtitle?.trim() ? (
              <p className={cn(utilityDropdownMetaClass, title?.trim() ? "mt-1" : null)}>
                {subtitle.trim()}
              </p>
            ) : null}
          </div>
        ) : null}

        <div
          className={cn(
            "min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-1.5 py-2",
            !showHeader && !footer ? "py-1.5" : null
          )}
        >
          {nonEmpty.map((group, groupIndex) => (
            <div key={groupIndex}>
              {groupIndex > 0 ? (
                <DropdownMenuSeparator className="mx-2 my-2 h-px shrink-0 bg-border/55" />
              ) : null}
              <DropdownMenuGroup className="p-0">
                {group.items.map((item) => {
                  const Icon = item.icon
                  const disabled = Boolean(item.disabled)
                  const rowClass = utilityDropdownItemClass(disabled)

                  const labelBlock = (
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5 text-left">
                      <span className={cn(utilityDropdownActionClass, "line-clamp-2")}>
                        {item.label}
                      </span>
                      {item.description ? (
                        <span
                          className={cn(
                            utilityDropdownMetaClass,
                            "text-pretty [overflow-wrap:anywhere]"
                          )}
                        >
                          {item.description}
                        </span>
                      ) : null}
                    </span>
                  )

                  if (item.href && !disabled) {
                    return (
                      <DropdownMenuItem key={item.id} asChild>
                        <Link
                          href={item.href}
                          prefetch={false}
                          className={rowClass}
                        >
                          {Icon ? (
                            <Icon
                              aria-hidden
                              className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                            />
                          ) : null}
                          {labelBlock}
                        </Link>
                      </DropdownMenuItem>
                    )
                  }

                  return (
                    <DropdownMenuItem
                      key={item.id}
                      disabled={disabled}
                      onSelect={() => {
                        if (!disabled) item.onSelect?.()
                      }}
                      className={rowClass}
                    >
                      {Icon ? (
                        <Icon
                          aria-hidden
                          className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                        />
                      ) : null}
                      {labelBlock}
                    </DropdownMenuItem>
                  )
                })}
              </DropdownMenuGroup>
            </div>
          ))}
        </div>

        {footer ? (
          <div
            className={cn(
              "shrink-0 border-t border-border/50 px-4 py-2.5",
              utilityDropdownFootnoteClass,
              "[&_p]:m-0"
            )}
          >
            {footer}
          </div>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
