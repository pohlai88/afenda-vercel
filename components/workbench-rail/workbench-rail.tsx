"use client"

import { PanelLeft } from "lucide-react"

import { Button } from "#components/ui/button"
import { cn } from "#lib/utils"

import { WorkbenchRailActions } from "./workbench-rail-actions"
import { WorkbenchRailContext } from "./workbench-rail-context"
import { WorkbenchRailIdentityZone } from "./workbench-rail-identity"
import { WorkbenchRailNav } from "./workbench-rail-nav"
import type { WorkbenchRailProps } from "./workbench-rail.types"

export function WorkbenchRail({
  slots,
  labels,
  collapsed,
  onToggleCollapse,
}: WorkbenchRailProps) {
  const toggleLabel = collapsed ? labels.expandLabel : labels.collapseLabel

  return (
    <div
      className={cn(
        "flex h-full min-h-0 flex-col overflow-hidden",
        collapsed ? "items-center" : "items-stretch"
      )}
      aria-label={labels.ariaLabel}
    >
      {/* Collapse toggle — desktop only; mobile collapse is owned by the parent shell */}
      <div
        className={cn(
          "hidden shrink-0 pb-3 lg:flex",
          collapsed ? "justify-center" : "justify-end"
        )}
      >
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={toggleLabel}
          title={toggleLabel}
          onClick={onToggleCollapse}
          className="size-9 rounded-xl text-muted-foreground hover:bg-muted/45 hover:text-foreground"
        >
          <PanelLeft
            className={cn(
              "size-4 transition-transform",
              collapsed && "scale-x-[-1]"
            )}
          />
        </Button>
      </div>

      {/* Identity zone */}
      <WorkbenchRailIdentityZone
        identity={slots.identity}
        collapsed={collapsed}
        description={labels.description}
      />

      {/* Scrollable content region: nav + optional context strip */}
      <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto pb-4">
        <WorkbenchRailNav
          nav={slots.nav}
          collapsed={collapsed}
          navLabel={labels.navLabel}
        />

        {!collapsed && slots.context && slots.context.length > 0 ? (
          <WorkbenchRailContext
            context={slots.context}
            contextLabel={labels.contextLabel ?? ""}
          />
        ) : null}
      </div>

      {/* Actions zone — footer, always visible */}
      <WorkbenchRailActions
        actions={slots.actions}
        collapsed={collapsed}
        actionsLabel={labels.actionsLabel}
      />
    </div>
  )
}
