"use client"

import type { ComponentProps } from "react"

import { useRouter } from "#i18n/navigation"

import { authClient } from "#lib/auth-client"
import { Button } from "#components/ui/button"
import { clearOneThingClientStorage } from "#features/onething/client"
import { cn } from "#lib/utils"

type SignOutButtonProps = Omit<
  ComponentProps<typeof Button>,
  "type" | "onClick"
>

export function SignOutButton({
  className,
  variant = "ghost",
  size = "sm",
  children,
  ...rest
}: SignOutButtonProps = {}) {
  const router = useRouter()

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={cn("text-muted-foreground", className)}
      {...rest}
      onClick={async () => {
        // Wipe per-device OneThing client storage BEFORE the network call.
        // Composer drafts and the viewed-id LRU may carry sensitive
        // operational text on shared devices; clearing them must succeed
        // even if `signOut` itself fails.
        clearOneThingClientStorage()
        await authClient.signOut()
        router.push("/")
        router.refresh()
      }}
    >
      {children ?? "Sign out"}
    </Button>
  )
}
