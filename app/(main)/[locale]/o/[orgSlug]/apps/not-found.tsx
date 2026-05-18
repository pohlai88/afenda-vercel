"use client"

import { useParams } from "next/navigation"

import { Button } from "#components2/ui/button"
import { Link } from "#i18n/navigation"
import { organizationNexusPath } from "#features/nexus/client"

/**
 * ERP surface-tier 404 — rendered while `NexusShell` from `[orgSlug]/layout`
 * stays mounted when `notFound()` fires within the `/apps/*` segment.
 *
 * Uses useParams() to resolve orgSlug for contextual recovery links since
 * not-found.tsx cannot receive params as props.
 *
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/not-found
 */
export default function OrgAppsNotFound() {
  const params = useParams<{ orgSlug?: string | string[] }>()
  const orgSlugParam = params?.orgSlug
  const orgSlug =
    typeof orgSlugParam === "string"
      ? orgSlugParam
      : Array.isArray(orgSlugParam)
        ? orgSlugParam[0]
        : undefined

  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-muted-foreground">404</p>
        <h1 className="text-lg font-medium text-foreground">Page not found</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          Nexus workspace chrome stays mounted — use the module nav to open
          another surface.
        </p>
      </div>
      {orgSlug ? (
        <Button asChild variant="outline" size="sm">
          <Link href={organizationNexusPath(orgSlug)} prefetch={false}>
            Back to Nexus field
          </Link>
        </Button>
      ) : null}
    </div>
  )
}
