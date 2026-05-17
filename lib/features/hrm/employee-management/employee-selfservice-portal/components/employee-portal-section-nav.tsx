import type { Route } from "next"

import { Link } from "#i18n/navigation"
import { employeePortalPath, type EmployeePortalSection } from "#lib/portal"

const SECTION_ORDER: readonly EmployeePortalSection[] = [
  "leave",
  "payslips",
  "claims",
  "benefits",
  "attendance",
  "documents",
  "requests",
]

type EmployeePortalSectionNavProps = {
  portalSlug: string
  current: EmployeePortalSection
  labels: Record<EmployeePortalSection, string>
}

function navItemClassName(active: boolean): string {
  return active
    ? "inline-flex h-9 items-center rounded-md border border-foreground bg-foreground px-3 text-sm font-medium text-background"
    : "inline-flex h-9 items-center rounded-md border border-border bg-card px-3 text-sm font-medium text-foreground hover:bg-accent"
}

export function EmployeePortalSectionNav({
  portalSlug,
  current,
  labels,
}: EmployeePortalSectionNavProps) {
  const items: ReadonlyArray<{
    section: EmployeePortalSection
    label: string
    href: Route
  }> = SECTION_ORDER.map((section) => ({
    section,
    label: labels[section],
    href: employeePortalPath(portalSlug, section),
  }))

  return (
    <nav
      aria-label="Employee portal sections"
      className="rounded-lg border border-border/70 bg-muted/30 p-1"
    >
      <ul className="flex flex-wrap gap-1">
        {items.map((item) => {
          const active = item.section === current

          return (
            <li key={item.section}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={navItemClassName(active)}
              >
                {item.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
