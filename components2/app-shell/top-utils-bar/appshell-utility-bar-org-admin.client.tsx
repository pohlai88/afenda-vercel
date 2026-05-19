"use client"

import {
  ClipboardList,
  ExternalLink,
  LayoutDashboard,
  MessageSquare,
  Plug,
  Settings2,
  ShieldCheck,
  Users,
} from "lucide-react"
import type { Route } from "next"
import type { ReactNode } from "react"

import { cn } from "#lib/utils"
import { organizationAdminPath } from "#lib/org-apps-module-paths"

import { Link } from "#i18n/navigation"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipTrigger } from "../../ui/tooltip"
import {
  APP_SHELL_UTILITY_L2_MENU_TRIGGER_OPEN_STATE_CLASS,
  APP_SHELL_UTILITY_RAIL_MENU_SURFACE_CLASS,
} from "./appshell-utility-bar-dropdown-chrome.shared"
import { APP_SHELL_UTILITY_L2_ICON_CLASS } from "./appshell-utility-bar.client"

// ---------------------------------------------------------------------------
// Capability metadata (client-safe, derived from ORG_ADMIN_CAPABILITIES shape)
// ---------------------------------------------------------------------------

type OrgAdminPageItem = {
  segment: string
  label: string
  description: string
  icon: ReactNode
}

const ORG_ADMIN_PAGES: readonly OrgAdminPageItem[] = [
  {
    segment: "overview",
    label: "Overview",
    description: "Organization admin home",
    icon: <LayoutDashboard className="size-3.5 shrink-0" strokeWidth={2} />,
  },
  {
    segment: "members",
    label: "Members",
    description: "Invite, manage, and remove members",
    icon: <Users className="size-3.5 shrink-0" strokeWidth={2} />,
  },
  {
    segment: "audit",
    label: "Audit log",
    description: "Governance event timeline",
    icon: <ClipboardList className="size-3.5 shrink-0" strokeWidth={2} />,
  },
  {
    segment: "feedback",
    label: "Feedback inbox",
    description: "Submitted user feedback",
    icon: <MessageSquare className="size-3.5 shrink-0" strokeWidth={2} />,
  },
  {
    segment: "integrations",
    label: "Integrations",
    description: "Webhooks and outbound endpoints",
    icon: <Plug className="size-3.5 shrink-0" strokeWidth={2} />,
  },
  {
    segment: "settings",
    label: "Settings",
    description: "Profile, slug, and workspace configuration",
    icon: <Settings2 className="size-3.5 shrink-0" strokeWidth={2} />,
  },
] as const

export type UtilityBarOrgAdminPanelProps = {
  /**
   * Active organization slug. Required to build admin paths.
   * Omit on surfaces without a tenant session — panel shows guidance only.
   */
  orgSlug?: string | null
}

/** Right-rail org-admin quick-jump panel — DropdownMenu with page links. */
export function UtilityBarOrgAdminPanel({
  orgSlug = null,
}: UtilityBarOrgAdminPanelProps) {
  const hasSlug = typeof orgSlug === "string" && orgSlug.length > 0

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Organization admin"
              className={cn(
                APP_SHELL_UTILITY_L2_ICON_CLASS,
                APP_SHELL_UTILITY_L2_MENU_TRIGGER_OPEN_STATE_CLASS
              )}
            >
              <span
                aria-hidden
                className="size-[15px] shrink-0 [&>svg]:size-full"
              >
                <ShieldCheck strokeWidth={2} />
              </span>
            </button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom" align="center" sideOffset={8}>
          Organization admin
        </TooltipContent>
      </Tooltip>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className={cn("w-64 p-0", APP_SHELL_UTILITY_RAIL_MENU_SURFACE_CLASS)}
      >
        <div className="shrink-0 border-b border-border/50 px-4 py-3">
          <p className="text-xs font-semibold tracking-tight text-card-foreground">
            Organization admin
          </p>
          <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
            {hasSlug ? (
              <span className="font-mono">{orgSlug}</span>
            ) : (
              "No active workspace"
            )}
          </p>
        </div>

        {hasSlug ? (
          <div className="py-1">
            <DropdownMenuLabel className="px-3 py-1 text-[9px] font-semibold tracking-widest text-muted-foreground/70 uppercase">
              Pages
            </DropdownMenuLabel>
            {ORG_ADMIN_PAGES.map((page) => {
              let href: Route
              try {
                href = organizationAdminPath(orgSlug, page.segment) as Route
              } catch {
                return null
              }

              return (
                <DropdownMenuItem key={page.segment} asChild className="py-0">
                  <Link
                    href={href}
                    className="flex items-center gap-2.5 px-3 py-2"
                  >
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-muted/50 text-muted-foreground">
                      {page.icon}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] leading-tight font-medium text-foreground">
                        {page.label}
                      </p>
                      <p className="text-[9px] leading-tight text-muted-foreground">
                        {page.description}
                      </p>
                    </div>
                    <ExternalLink
                      className="size-3 shrink-0 text-muted-foreground/50"
                      strokeWidth={2}
                      aria-hidden
                    />
                  </Link>
                </DropdownMenuItem>
              )
            })}
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link
                href={organizationAdminPath(orgSlug, "overview") as Route}
                className="flex items-center justify-center gap-1.5 px-3 py-2 text-[11px] font-medium text-primary"
              >
                Open organization admin
                <ExternalLink className="size-3" strokeWidth={2} aria-hidden />
              </Link>
            </DropdownMenuItem>
          </div>
        ) : (
          <div className="px-4 py-4">
            <p className="text-[11px] text-muted-foreground">
              Navigate to an organization workspace to access the admin pages.
            </p>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
