"use client"

import Image from "next/image"
import { useEffect, useRef, useTransition } from "react"
import {
  BookOpen,
  Brain,
  Building2,
  Calculator,
  CheckSquare,
  Package,
  Settings,
  ShoppingCart,
  Users,
} from "lucide-react"
import { useTranslations } from "next-intl"
import { useRouter } from "#i18n/navigation"

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "#components/ui/command"
import type { DashboardNavModule } from "#lib/dashboard-module-paths"
import {
  DASHBOARD_NAV_MODULES,
  organizationDashboardPath,
} from "#lib/dashboard-module-paths"
import type { UserOrgSummary } from "#features/org-admin/client"
import {
  organizationAdminPath,
  switchActiveOrgAction,
} from "#features/org-admin/client"
import { LYNX_MODULE_NAV_ICON_PNG } from "#lib/site"

import { useCommandPalette } from "./command-palette-context"

const MODULE_ICONS: Record<
  Exclude<DashboardNavModule, "lynx">,
  React.ElementType
> = {
  contacts: Users,
  onething: CheckSquare,
  ithink: Brain,
  knowledge: BookOpen,
  sale: ShoppingCart,
  purchase: Package,
  inventory: Package,
  accounting: Calculator,
}

const ADMIN_SEGMENTS = ["members", "audit", "settings", "integrations"] as const

function DashboardModuleGlyph({ module }: { module: DashboardNavModule }) {
  if (module === "lynx") {
    return (
      <Image
        src={LYNX_MODULE_NAV_ICON_PNG}
        alt=""
        width={16}
        height={16}
        className="mr-2 size-4 shrink-0 object-contain opacity-80"
        aria-hidden
      />
    )
  }
  const Icon = MODULE_ICONS[module]
  return <Icon className="mr-2 size-4 text-muted-foreground" />
}

type CommandPaletteProps = {
  orgSlug: string
  userOrgs: UserOrgSummary[]
  currentOrgId: string
  showOrgAdminLink: boolean
}

/**
 * Global command palette (Cmd/Ctrl+K).
 *
 * v1 is navigation-only — no DB reads, no AI.
 * Three groups: Modules, Organizations, Admin (conditional).
 *
 * Mounted once in DashboardShell; opened by CommandPaletteContext.
 */
export function CommandPalette({
  orgSlug,
  userOrgs,
  currentOrgId,
  showOrgAdminLink,
}: CommandPaletteProps) {
  const { open, setOpen } = useCommandPalette()
  const router = useRouter()
  const t = useTranslations("Dashboard.commandPalette")
  const tNav = useTranslations("Dashboard.nav")
  const [isPending, startTransition] = useTransition()
  const openRef = useRef(open)
  useEffect(() => {
    openRef.current = open
  }, [open])

  // Cmd/Ctrl+K — stable listener; when closed, ignore if focus is in a text field.
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key !== "k" || !(e.metaKey || e.ctrlKey)) return
      if (e.repeat) return
      const target = e.target as HTMLElement | null
      if (!openRef.current && target) {
        if (
          target.isContentEditable ||
          target.closest("input, textarea, select")
        ) {
          return
        }
      }
      e.preventDefault()
      setOpen((v) => !v)
    }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [setOpen])

  const navigateTo = (href: string) => {
    setOpen(false)
    startTransition(() => {
      router.push(href)
    })
  }

  const switchOrg = (orgId: string) => {
    if (orgId === currentOrgId) {
      setOpen(false)
      return
    }
    setOpen(false)
    startTransition(async () => {
      await switchActiveOrgAction(orgId)
    })
  }

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      title={t("dialogTitle")}
      description={t("dialogDescription")}
    >
      <CommandInput placeholder={t("placeholder")} />
      <CommandList>
        <CommandEmpty>{t("empty")}</CommandEmpty>

        {/* Group 1: Modules */}
        <CommandGroup heading={t("groupModules")}>
          {DASHBOARD_NAV_MODULES.map((module) => (
            <CommandItem
              key={module}
              value={`module-${module}`}
              onSelect={() =>
                navigateTo(organizationDashboardPath(orgSlug, module))
              }
            >
              <DashboardModuleGlyph module={module} />
              <span>{tNav(module as DashboardNavModule)}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        {/* Group 2: Organizations */}
        {userOrgs.length > 1 ? (
          <>
            <CommandSeparator />
            <CommandGroup heading={t("groupOrganizations")}>
              {userOrgs.map((org) => (
                <CommandItem
                  key={org.id}
                  value={`org-${org.name}`}
                  onSelect={() => switchOrg(org.id)}
                  disabled={isPending}
                >
                  <Building2 className="mr-2 size-4 text-muted-foreground" />
                  <span className="flex-1 truncate">{org.name}</span>
                  {org.id === currentOrgId ? (
                    <span className="ml-2 shrink-0 text-xs text-muted-foreground">
                      {t("currentOrg")}
                    </span>
                  ) : null}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        ) : null}

        {/* Group 3: Admin (conditional) */}
        {showOrgAdminLink ? (
          <>
            <CommandSeparator />
            <CommandGroup heading={t("groupAdmin")}>
              {ADMIN_SEGMENTS.map((segment) => (
                <CommandItem
                  key={segment}
                  value={`admin-${segment}`}
                  onSelect={() =>
                    navigateTo(organizationAdminPath(orgSlug, segment))
                  }
                >
                  <Settings className="mr-2 size-4 text-muted-foreground" />
                  <span className="capitalize">{t(`admin.${segment}`)}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        ) : null}
      </CommandList>
    </CommandDialog>
  )
}
