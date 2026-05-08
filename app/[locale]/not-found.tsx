import { Link } from "#i18n/navigation"
import { AfendaBrandLockup } from "#components/afenda-brand"
import { Button } from "#components/ui/button"

/**
 * Locale-tier 404 — used by `notFound()` calls inside `app/[locale]/**`.
 * Keeps the locale shell mounted so links continue to resolve to `/{locale}/...`.
 *
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/not-found
 */
export default function LocaleNotFound() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 p-6">
      <Link
        href="/"
        prefetch={false}
        className="rounded-md outline-offset-4 focus-visible:outline-2 focus-visible:outline-ring"
      >
        <AfendaBrandLockup className="max-w-[200px]" />
      </Link>
      <div className="flex max-w-md flex-col gap-2 text-center">
        <p className="text-sm font-medium text-muted-foreground">404</p>
        <h1 className="text-lg font-medium text-foreground">Page not found</h1>
        <p className="text-sm text-muted-foreground">
          The page you are looking for does not exist or may have been moved.
        </p>
      </div>
      <Button asChild>
        <Link href="/" prefetch={false}>
          Go home
        </Link>
      </Button>
    </div>
  )
}
