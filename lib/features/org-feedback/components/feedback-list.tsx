import type { Route } from "next"
import { getTranslations } from "next-intl/server"

import { organizationAdminPath } from "#features/org-admin"
import { Link } from "#i18n/navigation"

import { serializeOrgFeedbackInboxSearchParams } from "../schemas/org-feedback-inbox.search-params"
import type {
  OrgFeedbackListResult,
  OrgFeedbackListStateFilter,
} from "../types"

import { FeedbackInboxTableClient } from "./feedback-inbox-table.client"

export type OrgFeedbackListProps = {
  orgSlug: string
  result: OrgFeedbackListResult
  stateFilter: OrgFeedbackListStateFilter
}

function listingHref(
  orgSlug: string,
  targetPage: number,
  stateFilter: OrgFeedbackListStateFilter
): Route {
  const base = organizationAdminPath(orgSlug, "feedback")
  return serializeOrgFeedbackInboxSearchParams(base, {
    page: targetPage <= 1 ? null : targetPage,
    state: stateFilter === "all" ? null : stateFilter,
  }) as Route
}

export async function OrgFeedbackList({
  orgSlug,
  result,
  stateFilter,
}: OrgFeedbackListProps) {
  const t = await getTranslations("OrgAdmin.feedback")

  const { items, page, totalPages, totalCount } = result

  const viewLinks = [
    {
      label: t("viewAll"),
      href: listingHref(orgSlug, 1, "all"),
      isActive: stateFilter === "all",
    },
    {
      label: t("viewNew"),
      href: listingHref(orgSlug, 1, "new"),
      isActive: stateFilter === "new",
    },
    {
      label: t("viewAcknowledged"),
      href: listingHref(orgSlug, 1, "acknowledged"),
      isActive: stateFilter === "acknowledged",
    },
    {
      label: t("viewResolved"),
      href: listingHref(orgSlug, 1, "resolved"),
      isActive: stateFilter === "resolved",
    },
    {
      label: t("viewRejected"),
      href: listingHref(orgSlug, 1, "rejected"),
      isActive: stateFilter === "rejected",
    },
  ] as const

  const prevHref = page > 1 ? listingHref(orgSlug, page - 1, stateFilter) : null
  const nextHref =
    totalPages > 0 && page < totalPages
      ? listingHref(orgSlug, page + 1, stateFilter)
      : null

  return (
    <div className="space-y-4">
      <nav
        aria-label={t("filterAria")}
        className="flex flex-wrap gap-2 border-b border-border/50 pb-3"
      >
        {viewLinks.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className={
              item.isActive
                ? "rounded-md bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground"
                : "rounded-md px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-muted/80 hover:text-foreground"
            }
            aria-current={item.isActive ? "page" : undefined}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("empty")}</p>
      ) : (
        <div className="overflow-x-auto rounded-md border border-border">
          <FeedbackInboxTableClient rows={items} />
        </div>
      )}

      {totalCount > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>
            {t("showingShort", {
              shown: items.length,
              total: totalCount,
            })}
            {totalPages > 1 ? ` · ${t("pageOf", { page, totalPages })}` : null}
          </span>
          <div className="flex gap-2">
            {prevHref ? (
              <Link
                href={prevHref}
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                {t("previous")}
              </Link>
            ) : (
              <span className="opacity-50">{t("previous")}</span>
            )}
            {nextHref ? (
              <Link
                href={nextHref}
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                {t("next")}
              </Link>
            ) : (
              <span className="opacity-50">{t("next")}</span>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}
