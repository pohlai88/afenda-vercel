"use client"

import { useRouter } from "#i18n/navigation"

import { authClient } from "#lib/auth-client"
import { Button } from "#components/ui/button"

export function SignOutButton() {
  const router = useRouter()

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="text-muted-foreground"
      onClick={async () => {
        await authClient.signOut()
        router.push("/")
        router.refresh()
      }}
    >
      Sign out
    </Button>
  )
}
