import type { Route } from "next"

import { redirect } from "next/navigation"

import { Link } from "#i18n/navigation"

import { canActInOrganization, listOrganizationIamAuditEvents } from "#lib/auth"
import { ensureAppLocale, toLocalePath } from "#lib/i18n/locales.shared"
import { requireOrgSession } from "#lib/tenant"

import { OrganizationAuditCsvExport } from "./audit-export-client"

type Search = Promise<{ page?: string | string[] }>

function parsePage(raw: string | undefined): number {
  const n = Number.parseInt(raw ?? "1", 10)
  if (!Number.isFinite(n) || n < 1) return 1
  return n
}

export default async function OrganizationAuditPage({
  searchParams,
  params,
}: {
  searchParams: Search
  params: Promise<{ locale: string }>
}) {
  const { locale: localeRaw } = await params
  const locale = ensureAppLocale(localeRaw)
  const auditPath = toLocalePath(locale, "/account/organization/audit")

  const orgSession = await requireOrgSession()
  const { organizationId } = orgSession

  const allowed = await canActInOrganization(
    orgSession.userId,
    orgSession.user.role,
    organizationId,
    "admin"
  )
  if (!allowed) {
    redirect(toLocalePath(locale, "/account/organization") as Route)
  }

  const sp = await searchParams
  const page = parsePage(
    typeof sp.page === "string"
      ? sp.page
      : Array.isArray(sp.page)
        ? sp.page[0]
        : undefined
  )

  const result = await listOrganizationIamAuditEvents({
    organizationId,
    page,
  })

  const prevHref = page > 1 ? (`${auditPath}?page=${page - 1}` as Route) : null
  const nextHref =
    result.totalPages > 0 && page < result.totalPages
      ? (`${auditPath}?page=${page + 1}` as Route)
      : null

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 py-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Organization audit
          </h1>
          <p className="text-sm text-muted-foreground">
            IAM events for this organization (actions starting with{" "}
            <code className="text-xs">org.</code>). Sensitive mutations should
            appear here after successful writes.
          </p>
        </div>
        <div className="flex flex-col items-end gap-2 sm:flex-row sm:items-center">
          <OrganizationAuditCsvExport />
          <Link
            href="/account/organization"
            className="shrink-0 text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            ← Back to organization
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
