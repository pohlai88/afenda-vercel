"use client"

import { useCallback, useEffect, useMemo } from "react"
import { useTranslations } from "next-intl"

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "#components/ui/command"
import { useRouter } from "#i18n/navigation"
import {
  DASHBOARD_NAV_MODULES,
  organizationDashboardPath,
  type DashboardNavModule,
} from "#lib/dashboard-module-paths"

import { useNexusCommand } from "./nexus-command-context"

type NexusCommandLayerProps = {
  orgSlug: string
}

export function NexusCommandLayer({ orgSlug }: NexusCommandLayerProps) {
  const { open, closeCommand, toggleCommand } = useNexusCommand()
  const router = useRouter()
  const tNav = useTranslations("Dashboard.nav")
  const tCmd = useTranslations("Dashboard.commandPalette")

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        toggleCommand()
      }
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

  const labels = useMemo(
    () =>
      Object.fromEntries(
        DASHBOARD_NAV_MODULES.map((m) => [m, tNav(m)])
      ) as Record<DashboardNavModule, string>,
    [tNav]
  )

  return (
    <CommandDialog
      open={open}
      onOpenChange={(v) => (v ? undefined : closeCommand())}
      title={tCmd("dialogTitle")}
      description={tCmd("dialogDescription")}
    >
      <CommandInput placeholder={tCmd("placeholder")} />
      <CommandList>
        <CommandEmpty>{tCmd("empty")}</CommandEmpty>

        <CommandGroup heading={tCmd("groupModules")}>
          {DASHBOARD_NAV_MODULES.map((module) => (
            <CommandItem
              key={module}
              value={labels[module]}
              onSelect={() =>
                handleNavigate(organizationDashboardPath(orgSlug, module))
              }
            >
              {labels[module]}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
