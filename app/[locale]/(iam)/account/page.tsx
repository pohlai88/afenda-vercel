import { requireAuthShellSignedInSession } from "#lib/auth"
import { Link } from "#i18n/navigation"
import { Button } from "#components/ui/button"
import { SignOutButton } from "#components/sign-out-button"

export const dynamic = "force-dynamic"

export default async function AccountIndexPage() {
  const session = await requireAuthShellSignedInSession()

  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-xl flex-col justify-center gap-4 px-4">
      <h1 className="text-2xl font-semibold text-foreground">Account</h1>
      <p className="text-muted-foreground">
        Signed in as{" "}
        <span className="font-medium text-foreground">
          {session.user.email}
        </span>
      </p>
      <div className="flex gap-3">
        <Button asChild variant="outline">
          <Link href="/account/identity">Identity</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/account/security">Security</Link>
        </Button>
        {/*
          Routes through the canonical client `SignOutButton` so the
          per-device OneThing client storage (composer drafts, viewed LRU)
          is wiped before the auth network call. A server-side `signOut`
          form here would skip that cleanup.
        */}
        <SignOutButton />
      </div>
    </main>
  )
}
