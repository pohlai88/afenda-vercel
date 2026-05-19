"use client"

import type { Route } from "next"
import { useLocale } from "next-intl"

import { Link } from "#i18n/navigation"

import { Badge } from "#components2/ui/badge"
import type {
  ListCellTone,
  ListColumn,
} from "#features/governed-surface/schemas/list-surface.schema"
import type { ListSurfaceRow } from "#features/governed-surface/schemas/list-surface-renderer.schema"
import { cn } from "#lib/utils"

const BADGE_TONE_CLASS: Record<ListCellTone, string> = {
  positive: "bg-success/15 text-success",
  attention: "bg-warning/15 text-warning-foreground",
  critical: "bg-destructive/15 text-destructive",
  default: "bg-muted text-muted-foreground",
}

function formatCurrency(
  value: number,
  locale: string,
  currency?: string
): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currency ?? "USD",
    }).format(value)
  } catch {
    return String(value)
  }
}

function formatDate(value: string, locale: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }
  return date.toLocaleDateString(locale)
}

function formatDateTime(value: string, locale: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }
  return date.toLocaleString(locale)
}

export type ListSurfaceCellProps = {
  column: ListColumn
  row: ListSurfaceRow
}

export function ListSurfaceCell({ column, row }: ListSurfaceCellProps) {
  const locale = useLocale()
  const raw = row.cells[column.id]
  const kind = column.cellKind?.kind ?? "text"
  const display = raw === undefined || raw === null ? "—" : String(raw)

  if (kind === "link" || (row.linkColumnId === column.id && row.rowHref)) {
    if (row.rowHref) {
      return (
        <Link
          href={row.rowHref as Route}
          prefetch={false}
          className="text-primary hover:underline"
        >
          {display}
        </Link>
      )
    }
    return display
  }

  if (kind === "badge") {
    const tone: ListCellTone =
      column.cellKind?.kind === "badge"
        ? (column.cellKind.tone ?? "default")
        : "default"
    return (
      <Badge
        variant="secondary"
        className={cn("font-medium", BADGE_TONE_CLASS[tone])}
      >
        {display}
      </Badge>
    )
  }

  if (kind === "currency" && typeof raw === "number") {
    const currency =
      column.cellKind?.kind === "currency"
        ? column.cellKind.currency
        : undefined
    return formatCurrency(raw, locale, currency)
  }

  if (kind === "date") {
    return formatDate(display, locale)
  }

  if (kind === "datetime") {
    return formatDateTime(display, locale)
  }

  return display
}
