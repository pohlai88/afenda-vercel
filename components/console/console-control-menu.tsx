"use client"

import { useTransition } from "react"
import { LogOut, Shield, UserRound } from "lucide-react"
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
import { clearOneThingClientStorage } from "#features/onething/client"

import { NexusUtilityTriggerTooltip } from "../nexus/nexus-utility-trigger-tooltip"

type ConsoleControlMenuProps = {
  userEmail: string
}

/** Account + sign-out only — no org context on the Console loading bay. */
export function ConsoleControlMenu({ userEmail }: ConsoleControlMenuProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const t = useTranslations("Console.topNav")

  const handleSignOut = () => {
    startTransition(async () => {
      clearOneThingClientStorage()
      await authClient.signOut()
      router.push("/")
      router.refresh()
    })
  }

  return (
    <DropdownMenu>
      <NexusUtilityTriggerTooltip tooltip={t("menuTriggerTooltip")} align="end">
        <DropdownMenuTrigger asChild>
          <NexusUtilityControlAvatarTrigger
            aria-label={t("menuTrigger")}
            disabled={isPending}
          />
        </DropdownMenuTrigger>
      </NexusUtilityTriggerTooltip>

      <DropdownMenuContent
        align="end"
        sideOffset={10}
        className="w-56 bg-background/92 backdrop-blur-2xl"
      >
        <DropdownMenuLabel className="truncate font-normal text-xs">
          {userEmail}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/account" className="flex items-center gap-2 text-sm">
            <UserRound className="size-3.5 shrink-0 text-muted-foreground" />
            <span>{t("account")}</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link
            href="/account/identity"
            className="flex items-center gap-2 text-sm"
          >
            <UserRound className="size-3.5 shrink-0 text-muted-foreground" />
            <span>{t("information")}</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link
            href="/account/security"
            className="flex items-center gap-2 text-sm"
          >
            <Shield className="size-3.5 shrink-0 text-muted-foreground" />
            <span>{t("security")}</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={handleSignOut}>
          <LogOut className="mr-2 size-4" aria-hidden />
          {t("signOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
