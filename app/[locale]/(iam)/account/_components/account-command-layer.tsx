"use client"

import { useCallback, useEffect } from "react"

import { useNexusCommand } from "#components/nexus/nexus-command-context"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "#components/ui/command"
import { useRouter } from "#i18n/navigation"

type AccountCommandItem = {
  label: string
  href: string
  description?: string
  keywords?: string[]
}

type AccountCommandLayerProps = {
  title: string
  description: string
  sectionsLabel: string
  quickActionsLabel: string
  sections: AccountCommandItem[]
  quickActions: AccountCommandItem[]
}

export function AccountCommandLayer({
  title,
  description,
  sectionsLabel,
  quickActionsLabel,
  sections,
  quickActions,
}: AccountCommandLayerProps) {
  const { open, closeCommand, toggleCommand } = useNexusCommand()
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

        <AccountCommandGroup
          heading={sectionsLabel}
          items={sections}
          onSelect={handleNavigate}
        />

        <AccountCommandGroup
          heading={quickActionsLabel}
          items={quickActions}
          onSelect={handleNavigate}
        />
      </CommandList>
    </CommandDialog>
  )
}

function AccountCommandGroup({
  heading,
  items,
  onSelect,
}: {
  heading: string
  items: AccountCommandItem[]
  onSelect: (href: string) => void
}) {
  if (items.length === 0) return null

  return (
    <CommandGroup heading={heading}>
      {items.map((item) => (
        <CommandItem
          key={`${item.label}-${item.href}`}
          value={[item.label, item.description, item.href, ...(item.keywords ?? [])]
            .filter(Boolean)
            .join(" ")}
          onSelect={() => onSelect(item.href)}
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
  )
}
