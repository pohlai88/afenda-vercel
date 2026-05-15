"use client"

import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import type { LucideIcon } from "lucide-react"
import type { Route } from "next"

import { useRouter } from "#i18n/navigation"
import { cn } from "#lib/utils"

import { Button } from "../ui/button"
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandLoading,
  CommandSeparator,
} from "../ui/command"
import { Kbd, KbdGroup } from "../ui/kbd"
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip"
import { useAppShellStore } from "../stores/app-shell.store"

// ---------------------------------------------------------------------------
// Keyboard — avoid hijacking Cmd/Ctrl+K while typing in inputs
// ---------------------------------------------------------------------------

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return (
    target.isContentEditable ||
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT"
  )
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AppShellCommandPaletteItem = {
  id: string
  label: string
  description?: string
  /**
   * Optional Lucide icon component to render at the leading edge of the item.
   * Accepts any Lucide icon: `import { UsersIcon } from "lucide-react"`.
   */
  icon?: LucideIcon
  keywords?: string[]
  shortcut?: string
  href?: Route
  onSelect?: () => void
}

export type AppShellCommandPaletteSection = {
  heading: string
  items: AppShellCommandPaletteItem[]
}

export type AppShellUtilityBarCommandSearchProps = {
  placeholder?: string
  dialogTitle?: string
  dialogDescription?: string
  triggerAriaLabel?: string
  /** Hover tooltip on the L1 trigger; defaults to `placeholder`. */
  triggerTooltip?: string
  /** Shown inside `CommandEmpty` (cmdk default empty state). */
  emptyLabel?: string
  /**
   * Show a loading spinner inside the command list.
   * Use while fetching dynamic/async suggestions.
   */
  isLoading?: boolean
  sections: AppShellCommandPaletteSection[]
}

/** Dialog + ⌘K listener only — mount via `AppSubLayout` `command` (or next to trigger). */
export type AppShellCommandPaletteProps = Omit<
  AppShellUtilityBarCommandSearchProps,
  "triggerAriaLabel"
>

export type AppShellUtilityBarCommandSearchTriggerProps = Pick<
  AppShellUtilityBarCommandSearchProps,
  "placeholder" | "triggerAriaLabel" | "triggerTooltip"
>

// ---------------------------------------------------------------------------
// CommandPaletteItemRow — single command item
//
// Icon treatment: items with an icon get a small bounding container
// (muted bg at rest → primary tint on selection). This follows the Linear /
// Vercel pattern: icon is contextually anchored, not floating raw.
//
// Shortcut: rendered as a <Kbd> badge so it matches the footer hint keys.
// ---------------------------------------------------------------------------

function CommandPaletteItemRow({
  item,
  onSelect,
}: {
  item: AppShellCommandPaletteItem
  onSelect: (item: AppShellCommandPaletteItem) => void
}) {
  const Icon = item.icon
  return (
    <CommandItem
      value={[item.label, item.id, item.description].filter(Boolean).join(" ")}
      keywords={[
        item.id,
        item.label,
        ...(item.keywords ?? []),
        ...(item.description ? [item.description] : []),
      ]}
      onSelect={() => onSelect(item)}
    >
      {Icon && (
        <span
          className={cn(
            "flex size-6 shrink-0 items-center justify-center rounded-md",
            "bg-muted/80 text-muted-foreground",
            "group-data-selected/command-item:bg-primary/[0.1] group-data-selected/command-item:text-primary",
            "transition-colors duration-100"
          )}
        >
          <Icon aria-hidden className="size-3.5" />
        </span>
      )}
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm leading-snug font-medium tracking-[-0.01em]">
          {item.label}
        </span>
        {item.description && (
          <span className="truncate text-[11px] leading-snug text-muted-foreground/70">
            {item.description}
          </span>
        )}
      </span>
      {item.shortcut && (
        <Kbd className="ml-auto shrink-0 opacity-50 group-data-selected/command-item:opacity-80">
          {item.shortcut}
        </Kbd>
      )}
    </CommandItem>
  )
}

// ---------------------------------------------------------------------------
// AppShellCommandPalette — CommandDialog + ⌘K (mount under AppSubLayout `command`)
// ---------------------------------------------------------------------------

export function AppShellCommandPalette({
  placeholder = "Type a command or search…",
  dialogTitle = "Command palette",
  dialogDescription = "Search commands and navigation.",
  emptyLabel = "No results found.",
  isLoading = false,
  sections,
}: AppShellCommandPaletteProps) {
  const router = useRouter()
  const commandOpen = useAppShellStore((s) => s.commandOpen)
  const closeCommand = useAppShellStore((s) => s.closeCommand)

  const [paletteGeneration, setPaletteGeneration] = useState(0)
  const wasOpenRef = useRef(false)

  useEffect(() => {
    if (commandOpen && !wasOpenRef.current) {
      setPaletteGeneration((g) => g + 1)
    }
    wasOpenRef.current = commandOpen
  }, [commandOpen])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.isComposing || event.repeat) return
      if (event.key !== "k" && event.key !== "K") return
      if (!event.metaKey && !event.ctrlKey) return
      if (isTypingTarget(event.target)) return
      event.preventDefault()
      useAppShellStore.getState().toggleCommand()
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [])

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next) closeCommand()
    },
    [closeCommand]
  )

  const handleSelectItem = useCallback(
    (item: AppShellCommandPaletteItem) => {
      if (item.onSelect) {
        item.onSelect()
      } else if (item.href) {
        router.push(item.href)
      }
      closeCommand()
    },
    [router, closeCommand]
  )

  const nonEmpty = useMemo(
    () => sections.filter((s) => s.items.length > 0),
    [sections]
  )

  return (
    <CommandDialog
      open={commandOpen}
      onOpenChange={handleOpenChange}
      title={dialogTitle}
      description={dialogDescription}
      showCloseButton={false}
    >
      <Command
        key={paletteGeneration}
        loop
        label={dialogTitle}
        className="flex flex-col overflow-hidden rounded-none border-0 bg-transparent p-0 shadow-none"
      >
        <CommandInput placeholder={placeholder} />
        <CommandList className="max-h-none min-h-0 flex-1">
          {isLoading ? (
            <CommandLoading />
          ) : (
            <>
              <CommandEmpty>{emptyLabel}</CommandEmpty>
              {nonEmpty.map((section, index) => (
                <Fragment key={section.heading}>
                  {index > 0 && <CommandSeparator />}
                  <CommandGroup heading={section.heading}>
                    {section.items.map((item) => (
                      <CommandPaletteItemRow
                        key={item.id}
                        item={item}
                        onSelect={handleSelectItem}
                      />
                    ))}
                  </CommandGroup>
                </Fragment>
              ))}
            </>
          )}
        </CommandList>

        <div
          role="note"
          aria-label="Keyboard shortcuts"
          className="flex shrink-0 items-center gap-3 border-t border-border/50 px-3 py-2"
        >
          <KbdGroup
            aria-hidden
            className="gap-1.5 text-xs text-muted-foreground/70"
          >
            <span className="inline-flex items-center gap-1">
              <Kbd>↵</Kbd>
              <span>select</span>
            </span>
            <span className="text-border" aria-hidden>
              ·
            </span>
            <span className="inline-flex items-center gap-1">
              <Kbd>Esc</Kbd>
              <span>close</span>
            </span>
            <span className="text-border" aria-hidden>
              ·
            </span>
            <span className="inline-flex items-center gap-1">
              <Kbd>↑↓</Kbd>
              <span>navigate</span>
            </span>
          </KbdGroup>
        </div>
      </Command>
    </CommandDialog>
  )
}

// ---------------------------------------------------------------------------
// AppShellUtilityBarCommandSearchTrigger — L1 search control (opens store)
// ---------------------------------------------------------------------------

export function AppShellUtilityBarCommandSearchTrigger({
  placeholder = "Type a command or search…",
  triggerAriaLabel = "Open command palette",
  triggerTooltip,
}: AppShellUtilityBarCommandSearchTriggerProps) {
  const commandOpen = useAppShellStore((s) => s.commandOpen)
  const openCommand = useAppShellStore((s) => s.openCommand)
  const tooltipBody = triggerTooltip ?? placeholder

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="outline"
          aria-haspopup="dialog"
          aria-expanded={commandOpen}
          aria-label={triggerAriaLabel}
          onClick={() => openCommand()}
          className={cn(
            "h-[33px] max-h-[33px] w-[100px] flex-none justify-center gap-0 px-2",
            "border-sidebar-border/50 bg-sidebar-accent/10 text-sidebar-foreground shadow-none",
            "hover:bg-sidebar-accent/30 hover:text-sidebar-accent-foreground",
            "transition-colors duration-150"
          )}
        >
          <Kbd className="px-1.5 text-[10px]" aria-hidden>
            ⌘K
          </Kbd>
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom" align="center" sideOffset={8}>
        {tooltipBody}
      </TooltipContent>
    </Tooltip>
  )
}

// ---------------------------------------------------------------------------
// AppShellUtilityBarCommandSearch — trigger + palette (default composition)
// ---------------------------------------------------------------------------

export function AppShellUtilityBarCommandSearch({
  placeholder = "Type a command or search…",
  dialogTitle = "Command palette",
  dialogDescription = "Search commands and navigation.",
  triggerAriaLabel = "Open command palette",
  triggerTooltip,
  emptyLabel = "No results found.",
  isLoading = false,
  sections,
}: AppShellUtilityBarCommandSearchProps) {
  return (
    <>
      <AppShellUtilityBarCommandSearchTrigger
        placeholder={placeholder}
        triggerAriaLabel={triggerAriaLabel}
        triggerTooltip={triggerTooltip}
      />
      <AppShellCommandPalette
        placeholder={placeholder}
        dialogTitle={dialogTitle}
        dialogDescription={dialogDescription}
        emptyLabel={emptyLabel}
        isLoading={isLoading}
        sections={sections}
      />
    </>
  )
}
