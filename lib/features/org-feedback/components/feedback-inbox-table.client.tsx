"use client"

import { useMemo } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { useFormatter, useTranslations } from "next-intl"

import { Badge } from "#components/ui/badge"
import { GovernedDataTableClient } from "#features/governed-surface/client"

import type { OrgFeedbackEventSummary } from "../types"

import { OrgFeedbackRowActions } from "./feedback-row-actions.client"

type FeedbackInboxTableClientProps = {
  rows: readonly OrgFeedbackEventSummary[]
}

export function FeedbackInboxTableClient({ rows }: FeedbackInboxTableClientProps) {
  const t = useTranslations("OrgAdmin.feedback")
  const format = useFormatter()

  const columns = useMemo(
    (): ColumnDef<OrgFeedbackEventSummary>[] => [
      {
        id: "when",
        header: t("headerWhen"),
        cell: ({ row }) => (
          <span className="text-xs whitespace-nowrap text-muted-foreground">
            {format.dateTime(new Date(row.original.createdAt), {
              dateStyle: "short",
              timeStyle: "short",
              timeZone: "UTC",
            })}{" "}
            {t("timestampSuffix")}
          </span>
        ),
      },
      {
        id: "actor",
        header: t("headerActor"),
        cell: ({ row }) => (
          <span className="font-mono text-xs">{row.original.actorUserId}</span>
        ),
      },
      {
        id: "category",
        header: t("headerCategory"),
        cell: ({ row }) => (
          <div className="flex flex-wrap items-center gap-1.5 text-xs capitalize">
            <span>{row.original.category}</span>
            {row.original.metadata?.source === "utility-marketplace" ? (
              <Badge variant="info">{t("marketplaceBadge")}</Badge>
            ) : null}
          </div>
        ),
      },
      {
        id: "severity",
        header: t("headerSeverity"),
        cell: ({ row }) => (
          <span className="text-xs">{row.original.severity}</span>
        ),
      },
      {
        id: "state",
        header: t("headerState"),
        cell: ({ row }) => (
          <span className="text-xs">{row.original.state}</span>
        ),
      },
      {
        id: "message",
        header: t("headerMessage"),
        cell: ({ row }) => (
          <div className="text-xs">
            {row.original.metadata?.requestKind === "rail-icon" ? (
              <div className="mb-1 flex flex-wrap gap-1.5">
                <Badge variant="secondary">{t("marketplaceRequestBadge")}</Badge>
                {row.original.metadata.utilityId ? (
                  <Badge variant="outline">{row.original.metadata.utilityId}</Badge>
                ) : null}
              </div>
            ) : null}
            <span className="line-clamp-4 whitespace-pre-wrap">
              {row.original.message}
            </span>
            {row.original.path ? (
              <span className="mt-1 block text-[10px] text-muted-foreground">
                {row.original.path}
              </span>
            ) : null}
          </div>
        ),
      },
      {
        id: "actions",
        header: t("headerActions"),
        cell: ({ row }) => (
          <OrgFeedbackRowActions id={row.original.id} state={row.original.state} />
        ),
      },
    ],
    [format, t]
  )

  return (
    <GovernedDataTableClient
      data={[...rows]}
      columns={columns}
      getRowId={(row) => row.id}
    />
  )
}
