"use client"

import { Link } from "#i18n/navigation"
import { cn } from "#lib/utils"

import { getWorkbenchRailIcon } from "./workbench-rail-icon-registry"
import type { WorkbenchRailNavItem } from "./workbench-rail.types"

type WorkbenchRailNavProps = {
  nav: WorkbenchRailNavItem[]
  collapsed: boolean
  navLabel: string
}

export function WorkbenchRailNav({
  nav,
  collapsed,
  navLabel,
}: WorkbenchRailNavProps) {
  return (
    <section className="space-y-2.5">
      {!collapsed ? (
        <p className="text-[0.72rem] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
          {navLabel}
        </p>
      ) : null}
      <nav
        className={cn(
          "grid",
          collapsed ? "justify-items-center gap-2" : "gap-1"
        )}
        aria-label={navLabel}
      >
        {nav.map((item) => {
          const Icon = getWorkbenchRailIcon(item.iconKey)
          const ActiveIcon = item.activeIconKey
            ? getWorkbenchRailIcon(item.activeIconKey)
            : null

          return (
            <Link
              key={item.id}
              href={item.href}
              aria-current={item.active ? "page" : undefined}
              aria-label={item.label}
              title={item.label}
              className={cn(
                "group transition-colors",
                collapsed
                  ? "flex size-10 items-center justify-center rounded-2xl"
                  : "flex items-start justify-between gap-3 rounded-xl px-3 py-2.5 text-left",
                item.active
                  ? "bg-muted/72 text-foreground"
                  : "text-muted-foreground hover:bg-muted/45 hover:text-foreground"
              )}
            >
              {collapsed ? (
                <Icon className="size-4 shrink-0" aria-hidden />
              ) : (
                <>
                  <span className="inline-flex min-w-0 items-start gap-3">
                    <Icon
                      className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                      aria-hidden
                    />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-foreground">
                        {item.label}
                      </span>
                      {item.description ? (
                        <span className="block pt-0.5 text-xs leading-5 text-muted-foreground">
                          {item.description}
                        </span>
                      ) : null}
                    </span>
                  </span>
                  {item.active && ActiveIcon ? (
                    <ActiveIcon
                      className="mt-0.5 size-4 shrink-0 text-primary"
                      aria-hidden
                    />
                  ) : null}
                </>
              )}
            </Link>
          )
        })}
      </nav>
    </section>
  )
}
