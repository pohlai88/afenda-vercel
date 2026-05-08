"use client"

import { useParams } from "next/navigation"

import { Button } from "#components/ui/button"
import { Link } from "#i18n/navigation"

/**
 * Admin workbench 404 — rendered inside OrgAdminWorkbenchShell (sidebar
 * remains mounted) when notFound() fires within the admin segment.
 *
 * Uses useParams() to resolve orgSlug for contextual recovery links since
 * not-found.tsx cannot receive params as props.
 *
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/not-found
 */
export default function OrgAdminNotFound() {
  const params = useParams<{ orgSlug: string }>()

  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-muted-foreground">404</p>
        <h1 className="text-lg font-medium text-foreground">Page not found</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          The admin workbench is still available — use the sidebar to navigate
          to another section.
        </p>
      </div>
      {params?.orgSlug ? (
        <Button asChild variant="outline" size="sm">
          <Link href={`/o/${params.orgSlug}/admin`}>
            Back to admin overview
          </Link>
        </Button>
      ) : null}
    </div>
  )
}
