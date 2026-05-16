"use client"

import { useParams } from "next/navigation"

import { Button } from "#components/ui/button"
import { Link } from "#i18n/navigation"

/**
 * Eval run 404 — rendered inside nested `AppSubLayout` when `notFound()`
 * fires for a missing runId. Parent org layout preserves shell continuity.
 *
 * Uses useParams() since not-found.tsx receives no props.
 */
export default function AdminKnowledgeRunNotFound() {
  const params = useParams<{ orgSlug?: string }>()

  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-muted-foreground">404</p>
        <h1 className="text-lg font-medium text-foreground">
          Evaluation run not found
        </h1>
        <p className="max-w-md text-sm text-muted-foreground">
          This evaluation run does not exist or may have been deleted.
        </p>
      </div>
      {params?.orgSlug ? (
        <Button asChild variant="outline" size="sm">
          <Link href={`/o/${params.orgSlug}/admin/knowledge/sources`}>
            Back to knowledge sources
          </Link>
        </Button>
      ) : null}
    </div>
  )
}
