import { Button } from "#components2/ui/button"
import { Link } from "#i18n/navigation"

/**
 * Tenant slug segment 404 — layout called `notFound()` (unknown slug, drift, etc.).
 * No dashboard/admin shell yet; offer console + home recovery.
 */
export default function OrgSlugNotFound() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="flex max-w-md flex-col gap-2">
        <p className="text-sm font-medium text-muted-foreground">404</p>
        <h1 className="text-lg font-medium text-foreground">
          Organization not available
        </h1>
        <p className="text-sm text-muted-foreground">
          We could not open this workspace. Pick another organization or return
          home.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button asChild variant="outline" size="sm">
          <Link href="/console">Organization console</Link>
        </Button>
        <Button asChild variant="ghost" size="sm">
          <Link href="/">Home</Link>
        </Button>
      </div>
    </div>
  )
}
