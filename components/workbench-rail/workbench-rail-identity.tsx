"use client"

import { cn } from "#lib/utils"

import type { WorkbenchRailIdentity } from "./workbench-rail.types"

type WorkbenchRailIdentityProps = {
  identity: WorkbenchRailIdentity
  collapsed: boolean
  description?: string
}

export function WorkbenchRailIdentityZone({
  identity,
  collapsed,
  description,
}: WorkbenchRailIdentityProps) {
  return (
    <div
      className={cn(
        "shrink-0 pb-4",
        collapsed ? "flex flex-col items-center gap-3" : "space-y-3"
      )}
    >
      <div
        className={cn(
          "flex items-start gap-3",
          collapsed && "flex-col items-center gap-2 text-center"
        )}
      >
        <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-base font-semibold text-primary">
          {identity.initial}
        </div>
        {!collapsed ? (
          <div className="min-w-0 space-y-1">
            <p className="truncate text-sm font-semibold text-foreground">
              {identity.displayName}
            </p>
            <p className="truncate text-sm text-muted-foreground">
              {identity.email}
            </p>
            {identity.pills.length > 0 ? (
              <div className="flex flex-wrap gap-2 pt-1 text-[0.73rem] text-muted-foreground">
                {identity.pills.map((pill) => (
                  <span
                    key={pill.label}
                    className={cn(
                      "rounded-full px-2 py-0.5 font-medium",
                      pill.tone === "positive" &&
                        "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
                      pill.tone === "attention" &&
                        "bg-amber-500/10 text-amber-700 dark:text-amber-300",
                      pill.tone === "default" && "truncate bg-muted/60"
                    )}
                  >
                    {pill.label}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
      {!collapsed && description ? (
        <p className="text-xs leading-5 text-muted-foreground">{description}</p>
      ) : null}
    </div>
  )
}
