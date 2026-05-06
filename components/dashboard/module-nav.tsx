"use client"

import Link from "next/link"
import type { Route } from "next"
import { usePathname } from "next/navigation"

import { Button } from "#components/ui/button"
import {
  ACCOUNTING_ROUTE,
  CONTACTS_ROUTE,
  INVENTORY_ROUTE,
  PURCHASE_ROUTE,
  SALE_ROUTE,
} from "#lib/dashboard-module-paths"

const navItems = [
  { href: CONTACTS_ROUTE as Route, label: "Contacts" },
  { href: SALE_ROUTE as Route, label: "Sale" },
  { href: PURCHASE_ROUTE as Route, label: "Purchase" },
  { href: INVENTORY_ROUTE as Route, label: "Inventory" },
  { href: ACCOUNTING_ROUTE as Route, label: "Accounting" },
] as const

export function DashboardModuleNav() {
  const pathname = usePathname()

  return (
    <nav className="flex flex-wrap gap-2" aria-label="Dashboard modules">
      {navItems.map((item) => {
        const isActive =
          pathname === item.href || pathname.startsWith(`${item.href}/`)

        return (
          <Button
            key={item.href}
            variant={isActive ? "secondary" : "outline"}
            size="sm"
            asChild
          >
            <Link href={item.href} aria-current={isActive ? "page" : undefined}>
              {item.label}
            </Link>
          </Button>
        )
      })}
    </nav>
  )
}
