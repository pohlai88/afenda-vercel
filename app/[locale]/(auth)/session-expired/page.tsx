import { Link } from "#i18n/navigation"
import { Button } from "#components/ui/button"

export default function SessionExpiredPage() {
  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-xl flex-col items-center justify-center gap-3 px-4 text-center">
      <h1 className="text-2xl font-semibold text-foreground">
        Session expired
      </h1>
      <p className="text-muted-foreground">
        Your session has ended. Sign in again to continue.
      </p>
      <Button asChild>
        <Link href="/sign-in">Sign in</Link>
      </Button>
    </main>
  )
}
