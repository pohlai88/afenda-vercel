import { Button } from "#components2/ui/button"
import { Link } from "#i18n/navigation"

/**
 * Invalid segment under `/account/…` (IAM route group) — matches account index
 * geometry so the surface stays consistent with signed-in account pages.
 *
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/not-found
 */
export default function IamGroupNotFound() {
  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-xl flex-col justify-center gap-6 px-4 text-center">
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-muted-foreground">404</p>
        <h1 className="text-lg font-medium text-foreground">Page not found</h1>
        <p className="text-sm text-muted-foreground">
          This account URL does not exist or may have been moved.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button asChild>
          <Link href="/account" prefetch={false}>
            Back to account
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/o" prefetch={false}>
            Dashboard
          </Link>
        </Button>
      </div>
    </main>
  )
}
