"use client"

import { useParams } from "next/navigation"

import { Button } from "#components/ui/button"
import { Link } from "#i18n/navigation"

/**
 * Dashboard-tier 404 — rendered inside DashboardShell (sidebar and top bar
 * remain mounted) when notFound() fires within the dashboard segment.
 *
 * Uses useParams() to resolve orgSlug for contextual recovery links since
 * not-found.tsx cannot receive params as props.
 *
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/not-found
 */
export default function OrgDashboardNotFound() {
  const params = useParams<{ orgSlug: string }>()

  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-muted-foreground">404</p>
        <h1 className="text-lg font-medium text-foreground">Page not found</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          The dashboard shell is still available — use the sidebar to navigate
          to another module.
        </p>
      </div>
      {params?.orgSlug ? (
        <Button asChild variant="outline" size="sm">
          <Link href={`/o/${params.orgSlug}/dashboard`}>Back to dashboard</Link>
        </Button>
      ) : null}
    </div>
  )
}
