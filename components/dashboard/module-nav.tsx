"use client"

import { useTranslations } from "next-intl"

import { Button } from "#components/ui/button"
import { Link, usePathname } from "#i18n/navigation"
import {
  organizationAdminPath,
  organizationDashboardPath,
} from "#lib/dashboard-module-paths"

const NAV_ITEMS = [
  { module: "contacts", labelKey: "contacts" },
  { module: "lynx", labelKey: "lynx" },
  { module: "sale", labelKey: "sale" },
  { module: "purchase", labelKey: "purchase" },
  { module: "inventory", labelKey: "inventory" },
  { module: "accounting", labelKey: "accounting" },
] as const

type DashboardModuleNavProps = {
  orgSlug: string
  showOrgAdminLink?: boolean
}

export function DashboardModuleNav({
  orgSlug,
  showOrgAdminLink = false,
}: DashboardModuleNavProps) {
  const pathname = usePathname()
  const t = useTranslations("Dashboard.nav")

  const adminHref = organizationAdminPath(orgSlug, "overview")
  const adminActive =
    pathname === adminHref || pathname.startsWith(`${adminHref}/`)

  return (
    <nav className="flex flex-wrap gap-2" aria-label={t("label")}>
      {NAV_ITEMS.map(({ module, labelKey }) => {
        const href = organizationDashboardPath(orgSlug, module)
        const isActive = pathname === href || pathname.startsWith(`${href}/`)

        return (
          <Button
            key={module}
            variant={isActive ? "secondary" : "outline"}
            size="sm"
            asChild
          >
            <Link href={href} aria-current={isActive ? "page" : undefined}>
              {t(labelKey)}
            </Link>
          </Button>
        )
      })}

      {showOrgAdminLink ? (
        <Button
          variant={adminActive ? "secondary" : "outline"}
          size="sm"
          asChild
        >
          <Link
            href={adminHref}
            aria-current={adminActive ? "page" : undefined}
          >
            {t("admin")}
          </Link>
        </Button>
      ) : null}
    </nav>
  )
}
