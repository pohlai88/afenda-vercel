import type { Route } from "next"
import { getFormatter, getTranslations } from "next-intl/server"

import { Badge } from "#components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "#components/ui/table"
import { organizationAdminPath } from "#features/org-admin"
import { Link } from "#i18n/navigation"

import type {
  OrgFeedbackListResult,
  OrgFeedbackListStateFilter,
} from "../types"
import { OrgFeedbackRowActions } from "./feedback-row-actions.client"

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
  const params = new URLSearchParams()
  if (targetPage > 1) params.set("page", String(targetPage))
  if (stateFilter !== "all") params.set("state", stateFilter)
  const q = params.toString()
  return (q.length > 0 ? `${base}?${q}` : base) as Route
}

export async function OrgFeedbackList({
  orgSlug,
  result,
  stateFilter,
}: OrgFeedbackListProps) {
  const t = await getTranslations("OrgAdmin.feedback")
  const format = await getFormatter()

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
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[140px]">{t("headerWhen")}</TableHead>
              <TableHead>{t("headerActor")}</TableHead>
              <TableHead>{t("headerCategory")}</TableHead>
              <TableHead>{t("headerSeverity")}</TableHead>
              <TableHead>{t("headerState")}</TableHead>
              <TableHead className="min-w-[200px]">
                {t("headerMessage")}
              </TableHead>
              <TableHead className="min-w-[220px]">
                {t("headerActions")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="align-top text-xs whitespace-nowrap text-muted-foreground">
                  {format.dateTime(new Date(row.createdAt), {
                    dateStyle: "short",
                    timeStyle: "short",
                    timeZone: "UTC",
                  })}{" "}
                  {t("timestampSuffix")}
                </TableCell>
                <TableCell className="align-top font-mono text-xs">
                  {row.actorUserId}
                </TableCell>
                <TableCell className="align-top text-xs capitalize">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span>{row.category}</span>
                    {row.metadata?.source === "utility-marketplace" ? (
                      <Badge variant="info">{t("marketplaceBadge")}</Badge>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell className="align-top text-xs">
                  {row.severity}
                </TableCell>
                <TableCell className="align-top text-xs">{row.state}</TableCell>
                <TableCell className="align-top text-xs">
                  {row.metadata?.requestKind === "rail-icon" ? (
                    <div className="mb-1 flex flex-wrap gap-1.5">
                      <Badge variant="secondary">
                        {t("marketplaceRequestBadge")}
                      </Badge>
                      {row.metadata.utilityId ? (
                        <Badge variant="outline">
                          {row.metadata.utilityId}
                        </Badge>
                      ) : null}
                    </div>
                  ) : null}
                  <span className="line-clamp-4 whitespace-pre-wrap">
                    {row.message}
                  </span>
                  {row.path ? (
                    <span className="mt-1 block text-[10px] text-muted-foreground">
                      {row.path}
                    </span>
                  ) : null}
                </TableCell>
                <TableCell className="align-top">
                  <OrgFeedbackRowActions id={row.id} state={row.state} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
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
