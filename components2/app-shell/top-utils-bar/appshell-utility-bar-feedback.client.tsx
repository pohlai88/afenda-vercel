"use client"

import { useState } from "react"
import { MessageSquare } from "lucide-react"
import { useTranslations } from "next-intl"

import { cn } from "#lib/utils"
import { OrgFeedbackComposeForm } from "#features/org-feedback/client"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "../../ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipTrigger } from "../../ui/tooltip"
import {
  APP_SHELL_UTILITY_L2_MENU_TRIGGER_OPEN_STATE_CLASS,
  APP_SHELL_UTILITY_RAIL_MENU_SURFACE_CLASS,
} from "./appshell-utility-bar-dropdown-chrome.shared"
import { APP_SHELL_UTILITY_L2_ICON_CLASS } from "./appshell-utility-bar.client"

/** Right-rail feedback panel — DropdownMenu anchored to the trigger. */
export function UtilityBarFeedbackPanel() {
  const t = useTranslations("Dashboard.shell.utilityBar.feedback")
  const [open, setOpen] = useState(false)
  const [formKey, setFormKey] = useState(0)

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next) {
      setFormKey((k) => k + 1)
    }
  }

  return (
    <DropdownMenu open={open} onOpenChange={handleOpenChange}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={t("trigger")}
              className={cn(
                APP_SHELL_UTILITY_L2_ICON_CLASS,
                APP_SHELL_UTILITY_L2_MENU_TRIGGER_OPEN_STATE_CLASS
              )}
            >
              <span
                aria-hidden
                className="size-[15px] shrink-0 [&>svg]:size-full"
              >
                <MessageSquare strokeWidth={2} />
              </span>
            </button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom" align="center" sideOffset={8}>
          {t("tooltip")}
        </TooltipContent>
      </Tooltip>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        onCloseAutoFocus={(e) => e.preventDefault()}
        className={cn("w-80 p-0", APP_SHELL_UTILITY_RAIL_MENU_SURFACE_CLASS)}
      >
        <div className="shrink-0 border-b border-border/50 px-4 py-3">
          <p className="text-xs font-semibold tracking-tight text-card-foreground">
            {t("title")}
          </p>
          <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
            {t("description")}
          </p>
        </div>

        <OrgFeedbackComposeForm
          key={formKey}
          onReset={() => setFormKey((k) => k + 1)}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
