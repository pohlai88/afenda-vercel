"use client"

import { useParams } from "next/navigation"

import { Button } from "#components2/ui/button"
import { Link } from "#i18n/navigation"
import { organizationHrmClaimsPath } from "#features/hrm/client"

export default function ClaimNotFound() {
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
        <h1 className="text-lg font-medium text-foreground">Claim not found</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          This claim does not exist in the active organization, or you no longer
          have access to it.
        </p>
      </div>
      {orgSlug ? (
        <Button asChild variant="outline" size="sm">
          <Link href={organizationHrmClaimsPath(orgSlug)} prefetch={false}>
            Back to claims
          </Link>
        </Button>
      ) : null}
    </div>
  )
}
