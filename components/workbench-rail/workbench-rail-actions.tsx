"use client"

import { SignOutButton } from "#components/sign-out-button"
import { Button } from "#components/ui/button"
import { Link } from "#i18n/navigation"
import { cn } from "#lib/utils"

import { getWorkbenchRailIcon } from "./workbench-rail-icon-registry"
import type { WorkbenchRailAction } from "./workbench-rail.types"

type WorkbenchRailActionsProps = {
  actions: WorkbenchRailAction[]
  collapsed: boolean
  actionsLabel: string
}

export function WorkbenchRailActions({
  actions,
  collapsed,
  actionsLabel,
}: WorkbenchRailActionsProps) {
  return (
    <section
      className={cn(
        "shrink-0 border-t border-border/10 pt-4",
        collapsed ? "w-full" : "space-y-2.5"
      )}
    >
      {!collapsed ? (
        <p className="text-[0.72rem] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
          {actionsLabel}
        </p>
      ) : null}
      <div className={cn("grid gap-2", collapsed && "justify-items-center")}>
        {actions.map((action) => {
          const Icon = getWorkbenchRailIcon(action.iconKey)

          return action.kind === "link" ? (
            <Button
              key={action.id}
              asChild
              variant="ghost"
              size="sm"
              aria-label={action.label}
              title={action.label}
              className={cn(
                collapsed
                  ? "size-10 justify-center rounded-2xl px-0 py-0 hover:bg-muted/45"
                  : "h-auto justify-start px-3 py-2.5 text-left hover:bg-muted/45"
              )}
            >
              <Link href={action.href}>
                {collapsed ? (
                  <Icon className="size-4 shrink-0" aria-hidden />
                ) : (
                  <span className="flex min-w-0 items-start gap-3">
                    <Icon
                      className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                      aria-hidden
                    />
                    <span className="flex min-w-0 flex-col items-start">
                      <span>{action.label}</span>
                      {action.description ? (
                        <span className="text-xs font-normal text-muted-foreground">
                          {action.description}
                        </span>
                      ) : null}
                    </span>
                  </span>
                )}
              </Link>
            </Button>
          ) : (
            <SignOutButton
              key={action.id}
              variant="ghost"
              size="sm"
              aria-label={action.label}
              title={action.label}
              className={cn(
                collapsed
                  ? "size-10 justify-center rounded-2xl px-0 py-0 hover:bg-muted/45"
                  : "h-auto justify-start px-3 py-2.5 text-left hover:bg-muted/45"
              )}
            >
              {collapsed ? (
                <Icon className="size-4 shrink-0" aria-hidden />
              ) : (
                <span className="flex min-w-0 items-start gap-3">
                  <Icon
                    className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                    aria-hidden
                  />
                  <span className="flex min-w-0 flex-col items-start">
                    <span>{action.label}</span>
                    {action.description ? (
                      <span className="text-xs font-normal text-muted-foreground">
                        {action.description}
                      </span>
                    ) : null}
                  </span>
                </span>
              )}
            </SignOutButton>
          )
        })}
      </div>
    </section>
  )
}
