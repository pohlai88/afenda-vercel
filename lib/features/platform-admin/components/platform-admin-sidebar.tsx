"use client"

import type { Route } from "next"
import { useTranslations } from "next-intl"

import { Link, usePathname } from "#i18n/navigation"

import { cn } from "#lib/utils"

import { PLATFORM_ADMIN_NAV_ITEMS, platformAdminPath } from "../constants"

const OVERVIEW_NAV_KEY = "overview" as const

export function PlatformAdminSidebar({ className }: { className?: string }) {
  const pathname = usePathname()
  const t = useTranslations("PlatformAdmin.nav")

  const overviewHref = platformAdminPath() as Route
  const overviewActive = pathname === overviewHref

  return (
    <nav
      className={cn("flex flex-col gap-1", className)}
      aria-label={t("aria")}
    >
      <Link
        href={overviewHref}
        className={cn(
          "rounded-md px-3 py-2 text-sm font-medium transition-colors",
          overviewActive
            ? "bg-secondary text-secondary-foreground"
            : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
        )}
        aria-current={overviewActive ? "page" : undefined}
      >
        {t(OVERVIEW_NAV_KEY)}
      </Link>
      {PLATFORM_ADMIN_NAV_ITEMS.map((item) => {
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
