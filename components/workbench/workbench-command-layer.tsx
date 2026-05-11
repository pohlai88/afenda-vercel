"use client"

import { useCallback, useEffect } from "react"

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "#components/ui/command"
import { useRouter } from "#i18n/navigation"

import { useWorkbenchCommand } from "./workbench-command-context"

export type WorkbenchCommandItem = {
  label: string
  href: string
  description?: string
  keywords?: string[]
}

export type WorkbenchCommandSection = {
  heading: string
  items: WorkbenchCommandItem[]
}

export type WorkbenchCommandLayerProps = {
  /** Dialog title for accessibility. */
  title: string
  /** Dialog description for accessibility. */
  description: string
  /** Sections of commands to display. Layouts build their own config. */
  sections: WorkbenchCommandSection[]
}

/**
 * Route-agnostic command palette. Layouts pass their own `sections` config so
 * this layer never couples to a specific route tree. Replaces both
 * `NexusCommandLayer` (org dashboard nav) and `AccountCommandLayer` (account nav).
 */
export function WorkbenchCommandLayer({
  title,
  description,
  sections,
}: WorkbenchCommandLayerProps) {
  const { open, closeCommand, toggleCommand } = useWorkbenchCommand()
  const router = useRouter()

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (event.key !== "k") return
      if (!event.metaKey && !event.ctrlKey) return
      event.preventDefault()
      toggleCommand()
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [toggleCommand])

  const handleNavigate = useCallback(
    (href: string) => {
      router.push(href as Parameters<typeof router.push>[0])
      closeCommand()
    },
    [router, closeCommand]
  )

  const nonEmpty = sections.filter((s) => s.items.length > 0)

  return (
    <CommandDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) closeCommand()
      }}
      title={title}
      description={description}
    >
      <CommandInput placeholder={title} />
      <CommandList>
        <CommandEmpty>{description}</CommandEmpty>
        {nonEmpty.map((section) => (
          <CommandGroup key={section.heading} heading={section.heading}>
            {section.items.map((item) => (
              <CommandItem
                key={`${item.label}-${item.href}`}
                value={[
                  item.label,
                  item.description,
                  item.href,
                  ...(item.keywords ?? []),
                ]
                  .filter(Boolean)
                  .join(" ")}
                onSelect={() => handleNavigate(item.href)}
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{item.label}</p>
                  {item.description ? (
                    <p className="truncate text-xs text-muted-foreground">
                      {item.description}
                    </p>
                  ) : null}
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
      </CommandList>
    </CommandDialog>
  )
}
