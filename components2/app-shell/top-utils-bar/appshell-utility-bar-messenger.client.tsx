"use client"

import { useState } from "react"
import { MessageCircle } from "lucide-react"
import { useTranslations } from "next-intl"

import { APP_SHELL_UTILITY_L2_ICON_CLASS } from "./appshell-utility-bar.client"
import {
  MessengerPanel,
  type MessengerPanelTransport,
} from "#features/messenger/client"
import { Tooltip, TooltipContent, TooltipTrigger } from "../../ui/tooltip"
import { cn } from "#lib/utils"

export function UtilityBarMessengerPanel({
  organizationId = null,
  previewStub = false,
  transport,
}: {
  organizationId?: string | null
  /** Dev shell preview — disables Ably and uses optional mock transport upstream. */
  previewStub?: boolean
  transport?: MessengerPanelTransport
}) {
  const t = useTranslations("Dashboard.shell.utilityBar.messenger")
  const [open, setOpen] = useState(false)
  const disabled = !organizationId

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label={t("trigger")}
            disabled={disabled}
            onClick={() => setOpen((v) => !v)}
            className={cn(
              APP_SHELL_UTILITY_L2_ICON_CLASS,
              open && "bg-muted/55 text-foreground",
              disabled && "pointer-events-none opacity-40"
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
        organizationId={organizationId}
        open={open}
        onOpenChange={setOpen}
        hideTrigger
        previewStub={previewStub}
        transport={transport}
      />
    </>
  )
}
