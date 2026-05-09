"use client"

import { useRouter } from "#i18n/navigation"

import { authClient } from "#lib/auth-client"
import { Button } from "#components/ui/button"
import { clearOneThingClientStorage } from "#features/onething/client"

export function SignOutButton() {
  const router = useRouter()

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="text-muted-foreground"
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
      Sign out
    </Button>
  )
}
