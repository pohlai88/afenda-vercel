"use client"

import type { ComponentProps } from "react"

import { useRouter } from "#i18n/navigation"

import { authClient } from "#lib/auth-client"
import { Button } from "#components2/ui/button"
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
        await authClient.signOut()
        router.push("/")
        router.refresh()
      }}
    >
      {children ?? "Sign out"}
    </Button>
  )
}
