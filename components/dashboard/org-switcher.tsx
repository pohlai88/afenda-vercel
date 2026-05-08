"use client"

import { useCallback, useState, useTransition } from "react"
import { Building2, Check, ChevronsUpDown } from "lucide-react"

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "#components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "#components/ui/popover"
import { Button } from "#components/ui/button"
import { cn } from "#lib/utils"
import type { UserOrgSummary } from "#features/org-admin/client"
import { switchActiveOrgAction } from "#features/org-admin/client"

type OrgSwitcherProps = {
  orgs: UserOrgSummary[]
  currentOrgId: string
  /** Localised copy */
  labels: {
    trigger: string
    search: string
    empty: string
  }
}

/**
 * Org switcher pill rendered in the L1 top bar.
 * Shows the current org name; click opens a command palette listing all orgs
 * the signed-in user is a member of. Selecting one calls `switchActiveOrgAction`.
 */
export function OrgSwitcher({ orgs, currentOrgId, labels }: OrgSwitcherProps) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const current = orgs.find((o) => o.id === currentOrgId)

  const handleSelect = useCallback(
    (orgId: string) => {
      if (orgId === currentOrgId) {
        setOpen(false)
        return
      }
      setOpen(false)
      startTransition(async () => {
        await switchActiveOrgAction(orgId)
      })
    },
    [currentOrgId]
  )

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          role="combobox"
          aria-expanded={open}
          aria-label={labels.trigger}
          disabled={isPending}
          className="max-w-[200px] justify-between gap-1.5 px-2 text-sm font-medium"
        >
          <Building2 className="size-4 shrink-0 text-muted-foreground" />
          <span className="truncate">{current?.name ?? "—"}</span>
          <ChevronsUpDown className="ml-auto size-3.5 shrink-0 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <Command>
          <CommandInput placeholder={labels.search} className="h-9" />
          <CommandList>
            <CommandEmpty>{labels.empty}</CommandEmpty>
            <CommandGroup>
              {orgs.map((org) => (
                <CommandItem
                  key={org.id}
                  value={org.name}
                  onSelect={() => handleSelect(org.id)}
                  className="gap-2"
                >
                  <Building2 className="size-4 shrink-0 text-muted-foreground" />
                  <span className="truncate">{org.name}</span>
                  <span className="ml-auto shrink-0 text-xs text-muted-foreground capitalize">
                    {org.role}
                  </span>
                  <Check
                    className={cn(
                      "size-4 shrink-0",
                      org.id === currentOrgId ? "opacity-100" : "opacity-0"
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
