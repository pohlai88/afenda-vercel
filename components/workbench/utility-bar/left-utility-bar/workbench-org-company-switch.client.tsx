"use client"

import { useState, useTransition } from "react"
import { Building2, Check, ChevronDown } from "lucide-react"
import { useTranslations } from "next-intl"

import { Popover, PopoverContent, PopoverTrigger } from "#components/ui/popover"
import { switchActiveOrgAction } from "#features/org-admin/client"
import type { UserOrgSummary } from "#features/org-admin/client"
import { cn } from "#lib/utils"

type WorkbenchOrgCompanySwitchProps = {
  orgId: string
  orgName: string
  userOrgs: UserOrgSummary[]
}

const TRIGGER_BUTTON_CLASS = cn(
  "h-8 max-w-[11rem] shrink gap-1.5 rounded-md px-2 py-0 text-xs font-medium sm:max-w-[14rem]",
  "border border-border/60 bg-card/40 text-foreground shadow-none hover:bg-muted/72"
)

const CONTEXT_ROW_CLASS =
  "flex min-w-0 max-w-[11rem] items-center gap-1.5 sm:max-w-[14rem]"

function memberRoleLabel(
  role: string,
  t: ReturnType<typeof useTranslations>
): string {
  if (role === "member" || role === "admin" || role === "owner") {
    return t(`role.${role}`)
  }
  return role
}

/**
 * L1 multi-organization control: shows active org name; when the user has
 * more than one membership, opens the canonical workspace switch menu.
 */
export function WorkbenchOrgCompanySwitch({
  orgId,
  orgName,
  userOrgs,
}: WorkbenchOrgCompanySwitchProps) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const t = useTranslations("Dashboard.shell.orgSwitcher")

  if (userOrgs.length <= 1) {
    return (
      <div
        className={cn(CONTEXT_ROW_CLASS, "text-muted-foreground")}
        title={orgName}
      >
        <Building2 className="size-3.5 shrink-0" aria-hidden />
        <span className="min-w-0 truncate text-xs font-medium text-foreground">
          {orgName}
        </span>
      </div>
    )
  }

  const handleSelect = (targetOrgId: string) => {
    if (targetOrgId === orgId) return
    startTransition(() => {
      setOpen(false)
      switchActiveOrgAction(targetOrgId)
    })
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          title={t("triggerTooltip")}
          disabled={isPending}
          aria-label={t("trigger")}
          className={TRIGGER_BUTTON_CLASS}
        >
          <Building2 className="size-3.5 shrink-0 text-muted-foreground" />
          <span className="min-w-0 flex-1 truncate text-left">{orgName}</span>
          <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        sideOffset={8}
        className="af-nexus-popover-panel w-64 bg-background/92 p-2"
      >
        <div className="px-3 py-2.5 text-xs text-muted-foreground">
          {t("menuHeading")}
        </div>
        <div className="-mx-0.5 my-1 h-px bg-border/50" />
        {userOrgs.map((org) => {
          const selected = org.id === orgId
          return (
            <button
              key={org.id}
              type="button"
              disabled={isPending}
              onClick={() => handleSelect(org.id)}
              className={cn(
                "flex w-full items-center gap-2 rounded-2xl px-[var(--af-menu-item-px)] py-[var(--af-menu-item-py)] text-left text-sm font-medium outline-hidden transition-colors",
                "hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground",
                "disabled:pointer-events-none disabled:opacity-50"
              )}
            >
              <Building2 className="size-3.5 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate">{org.name}</span>
              <span className="hidden max-w-[5.5rem] truncate text-[10px] text-muted-foreground sm:inline">
                {memberRoleLabel(org.role, t)}
              </span>
              {selected ? (
                <Check className="size-3.5 shrink-0 text-primary" aria-hidden />
              ) : null}
            </button>
          )
        })}
      </PopoverContent>
    </Popover>
  )
}
