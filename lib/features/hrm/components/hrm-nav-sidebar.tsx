"use client"

import { useTranslations } from "next-intl"

import { Link } from "#i18n/navigation"
import type { Route } from "next"
import { usePathname } from "#i18n/navigation"

import { cn } from "#lib/utils"

import { buildHrmNav, organizationHrmRootPath } from "../constants"

export function HrmNavSidebar({ orgSlug }: { orgSlug: string }) {
  const pathname = usePathname()
  const tShell = useTranslations("Dashboard.Hrm.shell")
  const tNav = useTranslations("Dashboard.Hrm.nav")
  const overviewHref = organizationHrmRootPath(orgSlug)
  const items = buildHrmNav(orgSlug)

  const overviewActive = /\/dashboard\/hrm\/?$/.test(pathname)

  return (
    <nav
      aria-label={tShell("capabilityNavAria")}
      className="flex flex-row flex-wrap gap-2 border-border pb-4 lg:flex-col lg:flex-nowrap lg:border-e lg:border-b-0 lg:pe-6 lg:pb-0"
    >
      <Link
        href={overviewHref}
        className={cn(
          "rounded-md px-2 py-1.5 text-sm transition-colors",
          overviewActive
            ? "bg-muted font-medium text-foreground"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        {tShell("overviewLink")}
      </Link>
      {items.map((item) => {
        const href = item.href as string
        const active = pathname === href || pathname.startsWith(`${href}/`)
        return (
          <Link
            key={item.capabilityId}
            href={item.href as Route}
            className={cn(
              "rounded-md px-2 py-1.5 text-sm transition-colors",
              active
                ? "bg-muted font-medium text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tNav(item.navKey)}
          </Link>
        )
      })}
    </nav>
  )
}
