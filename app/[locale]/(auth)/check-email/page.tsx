import { Link } from "#i18n/navigation"
import { Button } from "#components/ui/button"

export default function CheckEmailPage() {
  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-xl flex-col items-center justify-center gap-3 px-4 text-center">
      <h1 className="text-2xl font-semibold text-foreground">
        Check your email
      </h1>
      <p className="text-muted-foreground">
        We sent a verification code or link to your inbox.
      </p>
      <Button asChild>
        <Link href="/verify-email">Enter verification code</Link>
      </Button>
    </main>
  )
}
