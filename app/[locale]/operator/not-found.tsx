import { Button } from "#components/ui/button"
import { Link } from "#i18n/navigation"

/**
 * Operator 404 — rendered when `notFound()` fires under `/{locale}/operator/*`.
 *
 * The locale operator `layout.tsx` only redirects to the org-scoped operator
 * route (`/o/{orgSlug}/operator`); it does **not** mount `AppShell`. Full
 * workbench chrome lives under `app/[locale]/o/[orgSlug]/layout.tsx` after that
 * navigation. Keep this file as lightweight inline recovery UI.
 *
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/not-found
 */
export default function OperatorNotFound() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-muted-foreground">404</p>
        <h1 className="text-lg font-medium text-foreground">Page not found</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          The operator console page you are looking for does not exist.
        </p>
      </div>
      <Button asChild variant="outline" size="sm">
        <Link href="/operator">Back to operator overview</Link>
      </Button>
    </div>
  )
}
