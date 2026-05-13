"use client"

import { useTransition } from "react"
import {
  Building2,
  ExternalLink,
  LogOut,
  Shield,
  ShieldCheck,
  UserRound,
} from "lucide-react"
import { useTranslations } from "next-intl"

import { WorkbenchUtilityControlAvatarTrigger } from "./workbench-utility-control-avatar-trigger"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "#components/ui/dropdown-menu"
import { Link, useRouter } from "#i18n/navigation"
import { authClient } from "#lib/auth-client"
import { organizationAdminPath } from "#lib/dashboard-module-paths"

type WorkbenchControlMenuProps = {
  userEmail: string
  /** Undefined in no-org mode (console, operator) */
  orgSlug: string | undefined
  /** Undefined in no-org mode */
  orgName: string | undefined
  showOrgAdminLink: boolean
}

export function WorkbenchControlMenu({
  userEmail,
  orgSlug,
  orgName,
  showOrgAdminLink,
}: WorkbenchControlMenuProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const tShell = useTranslations("Dashboard.shell")

  const handleSignOut = () => {
    startTransition(async () => {
      await authClient.signOut()
      router.push("/")
      router.refresh()
    })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <WorkbenchUtilityControlAvatarTrigger
          aria-label={tShell("controlMenu.trigger")}
          title={tShell("controlMenu.triggerTooltip")}
          disabled={isPending}
        />
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={10}
        className="af-nexus-popover-panel w-60 bg-background/92"
      >
        {orgName ? (
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
        ) : null}

        {showOrgAdminLink && orgSlug ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link
                href={organizationAdminPath(orgSlug!, "overview")}
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
