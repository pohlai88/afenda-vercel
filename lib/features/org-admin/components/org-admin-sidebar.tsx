"use client"

import type { Route } from "next"
import { useTranslations } from "next-intl"

import { Link, usePathname } from "#i18n/navigation"

import { cn } from "#lib/utils"

import {
  ORG_ADMIN_OVERVIEW_NAV_KEY,
  buildOrgAdminNav,
  organizationAdminPath,
} from "../constants"

export function OrgAdminSidebar({
  orgSlug,
  className,
}: {
  orgSlug: string
  className?: string
}) {
  const pathname = usePathname()
  const t = useTranslations("OrgAdmin.nav")

  const overviewHref = organizationAdminPath(orgSlug, "overview") as Route
  const overviewActive = pathname === overviewHref
  const navItems = buildOrgAdminNav(orgSlug)

  return (
    <nav
      className={cn("flex flex-col gap-1", className)}
      aria-label={t("aria")}
    >
      <Link
        key={overviewHref}
        href={overviewHref}
        className={cn(
          "rounded-md px-3 py-2 text-sm font-medium transition-colors",
          overviewActive
            ? "bg-secondary text-secondary-foreground"
            : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
        )}
        aria-current={overviewActive ? "page" : undefined}
      >
        {t(ORG_ADMIN_OVERVIEW_NAV_KEY)}
      </Link>
      {navItems.map((item) => {
        const href = item.href as Route
        const isActive = pathname === href || pathname.startsWith(`${href}/`)
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "rounded-md px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-secondary text-secondary-foreground"
                : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
            )}
            aria-current={isActive ? "page" : undefined}
          >
            {t(item.navKey)}
          </Link>
        )
      })}
    </nav>
  )
}
