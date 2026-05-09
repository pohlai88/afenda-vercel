import type { Route } from "next"
import type { ReactNode } from "react"

import { useTranslations } from "next-intl"

import { Link } from "#i18n/navigation"

import type { OrganizationIamAuditRow } from "#lib/auth"
import { cn } from "#lib/utils"

type OrgAuditEventsViewProps = {
  title: string
  description: ReactNode
  exportSlot?: ReactNode
  /** Production / simulated / all — switches `view` query on the audit page. */
  viewLinks?: { label: string; href: Route; isActive: boolean }[]
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
  viewLinks,
  backHref,
  backLabel,
  result,
  prevHref,
  nextHref,
}: OrgAuditEventsViewProps) {
  const t = useTranslations("OrgAdmin.audit.events")
  const noValue = t("noValue")

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

      {viewLinks && viewLinks.length > 0 ? (
        <nav className="flex flex-wrap gap-2" aria-label={t("viewAria")}>
          {viewLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              prefetch={false}
              aria-current={item.isActive ? "page" : undefined}
              className={cn(
                "rounded-md border px-3 py-1.5 text-sm font-medium transition-colors",
                item.isActive
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border bg-background text-muted-foreground hover:bg-muted/60"
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      ) : null}

      <p className="text-xs text-muted-foreground">
        {t("showingShort", { shown: result.rows.length, total: result.total })}
        {result.totalPages > 0 ? (
          <>
            {" — "}
            {t("pageOf", { page: result.page, totalPages: result.totalPages })}
          </>
        ) : null}
      </p>

      {result.rows.length === 0 ? (
        <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
          {t("empty")}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b bg-muted/40">
              <tr>
                <th className="px-3 py-2 font-medium">{t("headerWhen")}</th>
                <th className="px-3 py-2 font-medium">{t("headerOrigin")}</th>
                <th className="px-3 py-2 font-medium">{t("headerAction")}</th>
                <th className="px-3 py-2 font-medium">{t("headerActor")}</th>
                <th className="px-3 py-2 font-medium">{t("headerResource")}</th>
                <th className="px-3 py-2 font-medium">{t("headerDetails")}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {result.rows.map((r) => (
                <tr key={r.id}>
                  <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">
                    {r.createdAt.toISOString().replace("T", " ").slice(0, 19)}{" "}
                    {t("timestampSuffix")}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">
                    {r.auditOrigin}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">{r.action}</td>
                  <td className="max-w-[180px] truncate px-3 py-2">
                    {r.actorEmail ?? r.actorUserId ?? noValue}
                  </td>
                  <td className="max-w-[200px] truncate px-3 py-2 text-xs">
                    {r.resourceType && r.resourceId
                      ? `${r.resourceType}:${r.resourceId}`
                      : noValue}
                  </td>
                  <td className="max-w-[280px] truncate px-3 py-2 text-xs text-muted-foreground">
                    {r.metadataSummary ?? r.path ?? noValue}
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
            {t("previous")}
          </Link>
        ) : (
          <span className="text-sm text-muted-foreground">{t("previous")}</span>
        )}
        {nextHref ? (
          <Link
            href={nextHref}
            className="text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            {t("next")}
          </Link>
        ) : (
          <span className="text-sm text-muted-foreground">{t("next")}</span>
        )}
      </div>
    </div>
  )
}
