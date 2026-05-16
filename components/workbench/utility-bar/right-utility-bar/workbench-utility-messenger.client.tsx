"use client"

import { useState } from "react"
import { MessageCircle } from "lucide-react"
import { useTranslations } from "next-intl"

import { MessengerPanel } from "#features/messenger/client"
import { Tooltip, TooltipContent, TooltipTrigger } from "#components/ui/tooltip"
import { cn } from "#lib/utils"

import { WORKBENCH_UTILITY_ROUND_CONTROL_CLASS } from "../workbench-utility-round-control-class"

/**
 * Org-scoped Messenger (Ably realtime + Server Actions) for the workbench L1 rail.
 * Token mint: `POST /api/erp/messenger/auth`; server publish after messenger mutations.
 */
export function WorkbenchUtilityMessenger({ orgId }: { orgId: string }) {
  const t = useTranslations("Dashboard.shell.utilityBar.messenger")
  const [open, setOpen] = useState(false)

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label={t("trigger")}
            onClick={() => setOpen((v) => !v)}
            className={cn(
              WORKBENCH_UTILITY_ROUND_CONTROL_CLASS,
              open && "bg-muted/55 text-foreground"
            )}
          >
            <span
              aria-hidden
              className="size-[15px] shrink-0 [&>svg]:size-full"
            >
              <MessageCircle strokeWidth={2} />
            </span>
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" align="center" sideOffset={8}>
          {t("tooltip")}
        </TooltipContent>
      </Tooltip>
      <MessengerPanel
        organizationId={orgId}
        open={open}
        onOpenChange={setOpen}
        hideTrigger
      />
    </>
  )
}
