import type { Route } from "next"
import type { ReactNode } from "react"

import { Link } from "#i18n/navigation"

import type { OrganizationIamAuditRow } from "#lib/auth"

type OrgAuditEventsViewProps = {
  title: string
  description: ReactNode
  exportSlot?: ReactNode
  backHref: Route
  backLabel: string
  result: {
    rows: OrganizationIamAuditRow[]
    total: number
    page: number
    totalPages: number
  }
  prevHref: Route | null
  nextHref: Route | null
}

export function OrgAuditEventsView({
  title,
  description,
  exportSlot,
  backHref,
  backLabel,
  result,
  prevHref,
  nextHref,
}: OrgAuditEventsViewProps) {
  return (
    <div className="flex w-full min-w-0 flex-col gap-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
          <div className="text-sm text-muted-foreground">{description}</div>
        </div>
        <div className="flex flex-col items-end gap-2 sm:flex-row sm:items-center">
          {exportSlot}
          <Link
            href={backHref}
            className="shrink-0 text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            {backLabel}
          </Link>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Showing {result.rows.length} of {result.total} event
        {result.total === 1 ? "" : "s"}
        {result.totalPages > 0 ? (
          <>
            {" "}
            — page {result.page} of {result.totalPages}
          </>
        ) : null}
      </p>

      {result.rows.length === 0 ? (
        <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
          No organization audit events yet.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b bg-muted/40">
              <tr>
                <th className="px-3 py-2 font-medium">When</th>
                <th className="px-3 py-2 font-medium">Action</th>
                <th className="px-3 py-2 font-medium">Actor</th>
                <th className="px-3 py-2 font-medium">Resource</th>
                <th className="px-3 py-2 font-medium">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {result.rows.map((r) => (
                <tr key={r.id}>
                  <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">
                    {r.createdAt.toISOString().replace("T", " ").slice(0, 19)}
                    UTC
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">{r.action}</td>
                  <td className="max-w-[180px] truncate px-3 py-2">
                    {r.actorEmail ?? r.actorUserId ?? "—"}
                  </td>
                  <td className="max-w-[200px] truncate px-3 py-2 text-xs">
                    {r.resourceType && r.resourceId
                      ? `${r.resourceType}:${r.resourceId}`
                      : "—"}
                  </td>
                  <td className="max-w-[280px] truncate px-3 py-2 text-xs text-muted-foreground">
                    {r.metadataSummary ?? r.path ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        {prevHref ? (
          <Link
            href={prevHref}
            className="text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            Previous
          </Link>
        ) : (
          <span className="text-sm text-muted-foreground">Previous</span>
        )}
        {nextHref ? (
          <Link
            href={nextHref}
            className="text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            Next
          </Link>
        ) : (
          <span className="text-sm text-muted-foreground">Next</span>
        )}
      </div>
    </div>
  )
}
