"use client"

import { useTransition } from "react"
import {
  Building2,
  ChevronRight,
  ExternalLink,
  LogOut,
  Shield,
  ShieldCheck,
  SlidersHorizontal,
  UserRound,
} from "lucide-react"
import { useTranslations } from "next-intl"

import { NexusUtilityControlAvatarTrigger } from "#components/nexus/nexus-utility-control-avatar-trigger"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "#components/ui/dropdown-menu"
import { Link, useRouter } from "#i18n/navigation"
import { authClient } from "#lib/auth-client"
import { organizationAdminPath } from "#lib/dashboard-module-paths"
import { clearOneThingClientStorage } from "#features/onething/client"
import { switchActiveOrgAction } from "#features/org-admin/client"
import type { UserOrgSummary } from "#features/org-admin/client"

import { NexusUtilityTriggerTooltip } from "./nexus-utility-trigger-tooltip"
import { useNexusUtilityWidgetUi } from "./nexus-utility-widget-preferences"

type NexusControlMenuProps = {
  userEmail: string
  orgSlug: string
  orgName: string
  currentOrgId: string
  userOrgs: UserOrgSummary[]
}

export function NexusControlMenu({
  userEmail,
  orgSlug,
  orgName,
  currentOrgId,
  userOrgs,
}: NexusControlMenuProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const tShell = useTranslations("Dashboard.shell")
  const { openUtilityCustomize } = useNexusUtilityWidgetUi()

  const currentOrg = userOrgs.find((o) => o.id === currentOrgId)
  const showOrgAdminLink =
    currentOrg?.role === "admin" || currentOrg?.role === "owner"
  const otherOrgs = userOrgs.filter((o) => o.id !== currentOrgId)

  const handleSignOut = () => {
    startTransition(async () => {
      clearOneThingClientStorage()
      await authClient.signOut()
      router.push("/")
      router.refresh()
    })
  }

  const handleSwitchOrg = (targetOrgId: string) => {
    startTransition(() => {
      switchActiveOrgAction(targetOrgId)
    })
  }

  return (
    <DropdownMenu>
      <NexusUtilityTriggerTooltip
        tooltip={tShell("controlMenu.triggerTooltip")}
        align="end"
      >
        <DropdownMenuTrigger asChild>
          <NexusUtilityControlAvatarTrigger
            aria-label={tShell("controlMenu.trigger")}
            disabled={isPending}
          />
        </DropdownMenuTrigger>
      </NexusUtilityTriggerTooltip>

      <DropdownMenuContent
        align="end"
        sideOffset={10}
        className="w-60 bg-background/92 backdrop-blur-2xl"
      >
        <DropdownMenuLabel className="flex items-center gap-2 font-normal">
          <Building2 className="size-3.5 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-foreground">
              {orgName}
            </p>
            <p className="truncate text-[10px] text-muted-foreground">
              {tShell("controlMenu.current")}
            </p>
          </div>
        </DropdownMenuLabel>

        {showOrgAdminLink ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link
                href={organizationAdminPath(orgSlug, "overview")}
                prefetch={false}
                className="flex items-center gap-2"
              >
                <ShieldCheck className="size-3.5 shrink-0 text-muted-foreground" />
                <span>{tShell("controlMenu.admin")}</span>
                <ExternalLink className="ml-auto size-3 text-muted-foreground" />
              </Link>
            </DropdownMenuItem>
          </>
        ) : null}

        {otherOrgs.length > 0 ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              {tShell("controlMenu.organizations")}
            </DropdownMenuLabel>
            {otherOrgs.map((org) => (
              <DropdownMenuItem
                key={org.id}
                disabled={isPending}
                onSelect={() => handleSwitchOrg(org.id)}
                className="flex items-center gap-2 text-sm"
              >
                <Building2 className="size-3.5 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate">{org.name}</span>
                <ChevronRight className="size-3 shrink-0 text-muted-foreground" />
              </DropdownMenuItem>
            ))}
          </>
        ) : null}

        <DropdownMenuSeparator />
        <DropdownMenuLabel className="flex flex-col gap-0 font-normal">
          <span className="truncate text-xs text-foreground">{userEmail}</span>
        </DropdownMenuLabel>
        <DropdownMenuItem asChild>
          <Link href="/account" className="flex items-center gap-2 text-sm">
            <UserRound className="size-3.5 shrink-0 text-muted-foreground" />
            <span>{tShell("controlMenu.account")}</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link
            href="/account/identity"
            className="flex items-center gap-2 text-sm"
          >
            <UserRound className="size-3.5 shrink-0 text-muted-foreground" />
            <span>{tShell("controlMenu.information")}</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link
            href="/account/security"
            className="flex items-center gap-2 text-sm"
          >
            <Shield className="size-3.5 shrink-0 text-muted-foreground" />
            <span>{tShell("controlMenu.security")}</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => openUtilityCustomize()}
          className="flex items-center gap-2 text-sm"
        >
          <SlidersHorizontal
            className="size-3.5 shrink-0 text-muted-foreground"
            aria-hidden
            strokeWidth={2}
          />
          <span>{tShell("controlMenu.customizeUtilityBar")}</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={handleSignOut}
          disabled={isPending}
          className="flex items-center gap-2 text-sm"
        >
          <LogOut className="size-3.5 shrink-0 text-muted-foreground" />
          <span>{tShell("controlMenu.signOut")}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
