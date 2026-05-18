import { getTranslations } from "next-intl/server"

import type { Route } from "next"

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#components2/ui/card"
import { ui } from "#lib/design-system"
import { cn } from "#lib/utils"

import { Link } from "#i18n/navigation"

import { organizationHrmPath } from "../../../constants"
import { EMPLOYEE_LIFECYCLE_READINESS_COUNTERS } from "../data/employee-lifecycle-surface-metadata.shared"
import type { EmployeeLifecycleReadinessCounts } from "../data/employee-lifecycle-readiness-counts.shared"

type HrmLifecycleReadinessStripProps = {
  orgSlug: string
  counts: EmployeeLifecycleReadinessCounts
}

function readinessHref(
  orgSlug: string,
  key: (typeof EMPLOYEE_LIFECYCLE_READINESS_COUNTERS)[number]["key"]
): Route {
  switch (key) {
    case "onboardingOpen":
      return organizationHrmPath(orgSlug, "onboarding")
    case "offboardingOpen":
      return organizationHrmPath(orgSlug, "offboarding")
    default:
      return organizationHrmPath(orgSlug, "lifecycle")
  }
}

function ReadinessStat({
  label,
  value,
  href,
}: {
  label: string
  value: number
  href: Route
}) {
  return (
    <Link
      href={href}
      className="block rounded-lg focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      <Card
        size="sm"
        className={cn(
          "h-full border-solid border-border transition-colors hover:border-ring",
          ui.elevation.card
        )}
      >
        <CardHeader className="pb-2">
          <CardDescription className="text-xs font-medium tracking-wide uppercase">
            {label}
          </CardDescription>
          <CardTitle className="text-2xl font-semibold tracking-tight tabular-nums">
            {value}
          </CardTitle>
        </CardHeader>
      </Card>
    </Link>
  )
}

export async function HrmLifecycleReadinessStrip({
  orgSlug,
  counts,
}: HrmLifecycleReadinessStripProps) {
  const t = await getTranslations("Dashboard.Hrm.lifecycle")

  return (
    <section aria-labelledby="hrm-lifecycle-readiness-heading">
      <h2
        id="hrm-lifecycle-readiness-heading"
        className="mb-3 text-sm font-semibold text-foreground"
      >
        {t("readinessHeading")}
      </h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {EMPLOYEE_LIFECYCLE_READINESS_COUNTERS.map((counter) => (
          <ReadinessStat
            key={counter.key}
            label={t(`readiness.${counter.key}`)}
            value={counts[counter.key]}
            href={readinessHref(orgSlug, counter.key)}
          />
        ))}
      </div>
    </section>
  )
}
