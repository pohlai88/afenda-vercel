"use client"

import { useParams } from "next/navigation"

import { Button } from "#components/ui/button"
import { Link } from "#i18n/navigation"

/**
 * Todos 404 — rendered inside DashboardShell (shell continuity preserved).
 * Uses useParams() for orgSlug since not-found.tsx receives no props.
 */
export default function OrgDashboardTodosNotFound() {
  const params = useParams<{ orgSlug?: string }>()

  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-muted-foreground">404</p>
        <h1 className="text-lg font-medium text-foreground">Todo not found</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          This item does not exist or may have been removed.
        </p>
      </div>
      {params?.orgSlug ? (
        <Button asChild variant="outline" size="sm">
          <Link href={`/o/${params.orgSlug}/dashboard/todos`}>
            Back to todos
          </Link>
        </Button>
      ) : null}
    </div>
  )
}
