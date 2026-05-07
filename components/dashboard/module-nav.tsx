"use client"

import type { Route } from "next"

import { Link, usePathname } from "#i18n/navigation"

import { Button } from "#components/ui/button"
import { organizationDashboardPath } from "#lib/dashboard-module-paths"

const NAV_ITEMS = [
  { module: "contacts", label: "Contacts" },
  { module: "sale", label: "Sale" },
  { module: "purchase", label: "Purchase" },
  { module: "inventory", label: "Inventory" },
  { module: "accounting", label: "Accounting" },
] as const

type DashboardModuleNavProps = {
  orgSlug: string
}

export function DashboardModuleNav({ orgSlug }: DashboardModuleNavProps) {
  const pathname = usePathname()

  return (
    <nav className="flex flex-wrap gap-2" aria-label="Dashboard modules">
      {NAV_ITEMS.map(({ module, label }) => {
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
              {label}
            </Link>
          </Button>
        )
      })}
    </nav>
  )
}
