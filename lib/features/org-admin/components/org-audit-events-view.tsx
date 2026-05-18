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
  listSlot?: ReactNode
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
  listSlot,
}: OrgAuditEventsViewProps) {
  const t = useTranslations("OrgAdmin.audit.events")

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

      {listSlot ?? (
        <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
          {t("empty")}
        </p>
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
