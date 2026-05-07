"use client"

import type { Route } from "next"
import { useTranslations } from "next-intl"

import { Button } from "#components/ui/button"

import { organizationAdminPath } from "#features/org-admin"

import { Link, usePathname } from "#i18n/navigation"

import { organizationDashboardPath } from "#lib/dashboard-module-paths"

const NAV_ITEMS = [
  { module: "contacts" as const, labelKey: "contacts" as const },
  { module: "lynx" as const, labelKey: "lynx" as const },
  { module: "sale" as const, labelKey: "sale" as const },
  { module: "purchase" as const, labelKey: "purchase" as const },
  { module: "inventory" as const, labelKey: "inventory" as const },
  { module: "accounting" as const, labelKey: "accounting" as const },
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

  const adminHref = organizationAdminPath(orgSlug, "overview") as Route
  const adminActive =
    pathname === adminHref || pathname.startsWith(`${adminHref}/`)

  return (
    <nav className="flex flex-wrap gap-2" aria-label="Dashboard modules">
      {NAV_ITEMS.map(({ module, labelKey }) => {
        const href = organizationDashboardPath(orgSlug, module) as Route
        const isActive = pathname === href || pathname.startsWith(`${href}/`)

        return (
          <Button
            key={href}
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
