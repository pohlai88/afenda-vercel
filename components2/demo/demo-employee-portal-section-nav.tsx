import { demoPath } from "#features/demo"
import { Link } from "#i18n/navigation"
import type { EmployeePortalSection } from "#lib/portal"

const SECTION_ORDER: readonly EmployeePortalSection[] = [
  "leave",
  "payslips",
  "claims",
  "benefits",
  "attendance",
  "documents",
  "requests",
]

type DemoEmployeePortalSectionNavProps = {
  labels: Record<EmployeePortalSection, string>
}

function navItemClassName(active: boolean): string {
  return active
    ? "inline-flex h-9 items-center rounded-md border border-foreground bg-foreground px-3 text-sm font-medium text-background"
    : "inline-flex h-9 items-center rounded-md border border-border bg-card px-3 text-sm font-medium text-muted-foreground"
}

export function DemoEmployeePortalSectionNav({
  labels,
}: DemoEmployeePortalSectionNavProps) {
  return (
    <nav
      className="flex flex-wrap gap-2"
      aria-label="Employee portal sections (demo)"
    >
      {SECTION_ORDER.map((section) => {
        const label = labels[section]
        if (section === "leave") {
          return (
            <Link
              key={section}
              href={demoPath("employee/leave")}
              className={navItemClassName(true)}
              prefetch={false}
              aria-current="page"
            >
              {label}
            </Link>
          )
        }
        return (
          <span
            key={section}
            className={navItemClassName(false)}
            aria-disabled="true"
            title="Planned demo route"
          >
            {label}
          </span>
        )
      })}
    </nav>
  )
}
