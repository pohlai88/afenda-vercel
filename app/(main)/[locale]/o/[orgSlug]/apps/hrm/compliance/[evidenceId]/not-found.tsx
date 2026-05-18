"use client"

import { useParams } from "next/navigation"

import { Button } from "#components2/ui/button"
import { Link } from "#i18n/navigation"
import { organizationHrmPath } from "#features/hrm/client"

/**
 * Phase 3K — Evidence-specific 404.
 *
 * Triggered when {@link listComplianceEvidenceTimeline} resolves to `null`
 * (evidence row missing OR belongs to a different org). App shell
 * stays mounted; we only restate the recovery target so the operator
 * doesn't lose context inside HR's drill-down flow.
 *
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/not-found
 */
export default function ComplianceEvidenceNotFound() {
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
        <h1 className="text-lg font-medium text-foreground">
          Evidence not found
        </h1>
        <p className="max-w-md text-sm text-muted-foreground">
          This compliance evidence row does not exist in the active
          organization, or you no longer have access. Return to the compliance
          evidence center.
        </p>
      </div>
      {orgSlug ? (
        <Button asChild variant="outline" size="sm">
          <Link
            href={organizationHrmPath(orgSlug, "compliance")}
            prefetch={false}
          >
            Back to compliance
          </Link>
        </Button>
      ) : null}
    </div>
  )
}
