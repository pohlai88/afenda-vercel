import { Button } from "#components2/ui/button"
import { Link } from "#i18n/navigation"

import { platformPath } from "#features/platform-admin"

/**
 * Platform 404 — rendered when `notFound()` fires under `/{locale}/platform/*`.
 */
export default function PlatformNotFound() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-muted-foreground">404</p>
        <h1 className="text-lg font-medium text-foreground">Page not found</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          The platform console page you are looking for does not exist.
        </p>
      </div>
      <Button asChild variant="outline" size="sm">
        <Link href={platformPath()}>Back to platform overview</Link>
      </Button>
    </div>
  )
}
