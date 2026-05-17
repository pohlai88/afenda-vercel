import { uiRadius, uiSurfaceElevation } from "#lib/design-system"
import { cn } from "#lib/utils"

/**
 * Shared surface tokens for utility-bar {@link DropdownMenuContent} panels.
 * Keeps marketplace / apps launcher / policy / {@link AppShellUtilityDropdown} visually aligned.
 */
const utilityDropdownMenuSurfaceBaseClass = cn(
  "flex max-h-[min(92vh,40rem)] min-w-0 flex-col gap-0 overflow-hidden p-0",
  "border border-border bg-card/95 text-card-foreground backdrop-blur-sm",
  uiRadius.popover,
  uiSurfaceElevation.raised,
  "ring-0 ring-offset-0"
)

/** Standard width — matches shell rule examples (`min(20rem, …)`). */
export const APP_SHELL_UTILITY_DROPDOWN_CONTENT_NARROW_CLASS = cn(
  utilityDropdownMenuSurfaceBaseClass,
  "w-[min(20rem,calc(100vw-2rem))]"
)

/** Wider panels (policy / dense menus). */
export const APP_SHELL_UTILITY_DROPDOWN_CONTENT_WIDE_CLASS = cn(
  utilityDropdownMenuSurfaceBaseClass,
  "w-[min(28rem,calc(100vw-2rem))]"
)

/**
 * Open-state fill for L2 {@link DropdownMenuTrigger} buttons (not avatar/brand discs).
 * @see `.cursor/rules/shell-utility-bar-controls.mdc`
 */
export const APP_SHELL_UTILITY_L2_MENU_TRIGGER_OPEN_STATE_CLASS =
  "data-[state=open]:bg-muted/55 data-[state=open]:text-foreground"

/**
 * Painted chrome for compact right-rail {@link DropdownMenuContent} panels.
 * Pair with a width / overflow prefix (`w-80 p-0`, `w-96 p-0`, etc.).
 */
export const APP_SHELL_UTILITY_RAIL_MENU_SURFACE_CLASS = cn(
  "border border-border bg-card/95 text-card-foreground backdrop-blur-sm",
  uiRadius.popover,
  uiSurfaceElevation.raised,
  "ring-0 ring-offset-0"
)
