"use client"

import * as React from "react"
import { Command as CommandPrimitive } from "cmdk"
import { LoaderCircleIcon, SearchIcon } from "lucide-react"

import { cn } from "#lib/utils"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./dialog"

function Command({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive>) {
  return (
    <CommandPrimitive
      data-slot="command"
      className={cn(
        "flex size-full flex-col overflow-hidden rounded-xl bg-popover text-popover-foreground",
        className
      )}
      {...props}
    />
  )
}

function CommandDialog({
  title = "Command Palette",
  description = "Search for a command to run...",
  children,
  className,
  showCloseButton = false,
  ...props
}: React.ComponentProps<typeof Dialog> & {
  title?: string
  description?: string
  className?: string
  showCloseButton?: boolean
}) {
  return (
    <Dialog {...props}>
      <DialogHeader className="sr-only">
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>
      <DialogContent
        className={cn(
          // Position upper-center — comfortable reading position, not dead-center
          "top-[20%] max-h-[min(82vh,38rem)] w-[calc(100%-1.5rem)] max-w-xl translate-y-0",
          // Container — override base rounded-4xl; use design-system depth token for elevation
          "gap-0 overflow-hidden rounded-xl! border border-border p-0",
          "shadow-[var(--af-depth-shell)]",
          className
        )}
        showCloseButton={showCloseButton}
      >
        {children}
      </DialogContent>
    </Dialog>
  )
}

function CommandInput({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Input>) {
  return (
    // Standard shadcn pattern: edge-to-edge with a bottom border divider.
    // No InputGroup pill — it creates a blob-within-blob inside the rounded dialog.
    <div data-slot="command-input-wrapper" className="flex items-center border-b border-border/60 px-3">
      <SearchIcon
        aria-hidden
        className="mr-2 size-4 shrink-0 opacity-40"
      />
      <CommandPrimitive.Input
        data-slot="command-input"
        className={cn(
          "flex h-11 w-full bg-transparent py-3 text-sm outline-hidden",
          "placeholder:text-muted-foreground/50",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        {...props}
      />
    </div>
  )
}

function CommandList({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.List>) {
  return (
    <CommandPrimitive.List
      data-slot="command-list"
      className={cn(
        "max-h-72 scroll-py-1 overflow-x-hidden overflow-y-auto overscroll-contain outline-none",
        className
      )}
      {...props}
    />
  )
}

function CommandEmpty({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Empty>) {
  return (
    <CommandPrimitive.Empty
      data-slot="command-empty"
      className={cn("py-8 text-center text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

function CommandGroup({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Group>) {
  return (
    <CommandPrimitive.Group
      data-slot="command-group"
      className={cn(
        "overflow-hidden p-1 text-foreground",
        "**:[[cmdk-group-heading]]:px-2 **:[[cmdk-group-heading]]:pb-1 **:[[cmdk-group-heading]]:pt-2",
        "**:[[cmdk-group-heading]]:text-[11px] **:[[cmdk-group-heading]]:font-medium",
        "**:[[cmdk-group-heading]]:tracking-wide **:[[cmdk-group-heading]]:uppercase",
        "**:[[cmdk-group-heading]]:text-muted-foreground/60",
        className
      )}
      {...props}
    />
  )
}

function CommandSeparator({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Separator>) {
  return (
    <CommandPrimitive.Separator
      data-slot="command-separator"
      className={cn("my-1 h-px bg-border/50", className)}
      {...props}
    />
  )
}

function CommandItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Item>) {
  return (
    <CommandPrimitive.Item
      data-slot="command-item"
      className={cn(
        "group/command-item relative flex cursor-default items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-hidden select-none",
        // Left indicator: always present as transparent, becomes primary on selection
        "border-l-[3px] border-l-transparent",
        "data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-40",
        // Selected state: accent bg + primary left bar + foreground text
        "data-selected:border-l-primary data-selected:bg-accent data-selected:text-accent-foreground",
        "transition-[background-color,border-color] duration-100",
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      {children}
    </CommandPrimitive.Item>
  )
}

function CommandLoading({
  className,
  children,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Loading>) {
  return (
    <CommandPrimitive.Loading
      data-slot="command-loading"
      className={cn("py-8 text-center text-sm text-muted-foreground", className)}
      {...props}
    >
      {children ?? (
        <span className="inline-flex items-center gap-2">
          <LoaderCircleIcon
            aria-hidden
            className="size-4 animate-spin text-muted-foreground"
          />
          Loading…
        </span>
      )}
    </CommandPrimitive.Loading>
  )
}

function CommandShortcut({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="command-shortcut"
      className={cn(
        "ml-auto text-xs tracking-widest text-muted-foreground/60",
        "group-data-selected/command-item:text-accent-foreground/70",
        className
      )}
      {...props}
    />
  )
}

export {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandLoading,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
}
