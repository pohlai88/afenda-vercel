import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#components/ui/card"
import { getTranslations } from "next-intl/server"

/**
 * Phase 3L — Suspense fallback for {@link ComplianceOperationalHealth}.
 *
 * Mirrors the same outer geometry (Card + 5-counter strip + footer
 * paragraph) so streaming in real data does NOT cause a layout shift.
 * Skeleton blocks render with `bg-muted` per the design contract — never
 * `bg-gray-*` palette utilities.
 */
export async function ComplianceOperationalHealthSkeleton() {
  const t = await getTranslations("Dashboard.Hrm.compliance.operationalHealth")
  return (
    <Card size="sm" aria-busy="true" aria-label={t("loadingAria")}>
      <CardHeader>
        <CardTitle className="text-base">{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, idx) => (
            <CounterSkeleton key={`counter-skeleton-${idx}`} />
          ))}
        </div>
        <div className="h-3 w-72 max-w-full rounded bg-muted" />
      </CardContent>
    </Card>
  )
}

function CounterSkeleton() {
  return (
    <div className="flex flex-col gap-2 rounded-md border border-border bg-card px-3 py-2">
      <div className="h-3 w-20 rounded bg-muted" />
      <div className="h-7 w-12 rounded bg-muted" />
    </div>
  )
}
