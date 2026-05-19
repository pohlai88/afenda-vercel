"use client"

import { useState } from "react"
import type { Route } from "next"
import { useTranslations } from "next-intl"
import { ArrowLeft, PenLine } from "lucide-react"

import { AddContactForm } from "#features/contacts/client"
import type {
  QuickCreateFormKind,
  QuickCreateMenu,
  QuickCreateMenuEntry,
} from "#features/nexus/client"
import {
  QuickCreateItemForm,
  QuickCreateSessionForm,
  QuickCreateSignalForm,
} from "#features/orbit/client"
import { Link } from "#i18n/navigation"
import { cn } from "#lib/utils"

import { Button } from "../../ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "../../ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipTrigger } from "../../ui/tooltip"
import { useAppShellStore } from "../../stores/app-shell.store"
import {
  APP_SHELL_UTILITY_L2_MENU_TRIGGER_OPEN_STATE_CLASS,
  APP_SHELL_UTILITY_RAIL_MENU_SURFACE_CLASS,
} from "./appshell-utility-bar-dropdown-chrome.shared"
import { APP_SHELL_UTILITY_L2_ICON_CLASS } from "./appshell-utility-bar.client"

type QuickCreateView =
  | { step: "pick" }
  | { step: "form"; form: QuickCreateFormKind }

type UtilityBarQuickCreatePanelProps = {
  menu: QuickCreateMenu
}

const GROUP_ORDER = ["orbit", "records", "modules"] as const

function groupEntries(
  entries: QuickCreateMenuEntry[],
  group: (typeof GROUP_ORDER)[number]
) {
  return entries.filter((entry) => entry.group === group)
}

function QuickCreateFormStep({
  form,
  orgSlug,
  onBack,
}: {
  form: QuickCreateFormKind
  orgSlug: string
  onBack: () => void
}) {
  const t = useTranslations("Dashboard.shell.utilityBar.quickCreatePanel")

  return (
    <div className="flex flex-col gap-3 px-4 py-4">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-7 w-fit gap-1.5 px-2 text-[11px] text-muted-foreground"
        onClick={onBack}
      >
        <ArrowLeft className="size-3.5" aria-hidden />
        {t("back")}
      </Button>
      <p className="text-xs font-medium text-foreground">
        {t(`forms.${form}`)}
      </p>
      {form === "orbit-signal" ? (
        <QuickCreateSignalForm orgSlug={orgSlug} />
      ) : null}
      {form === "orbit-item" ? (
        <QuickCreateItemForm orgSlug={orgSlug} />
      ) : null}
      {form === "orbit-session" ? (
        <QuickCreateSessionForm orgSlug={orgSlug} />
      ) : null}
      {form === "contact" ? <AddContactForm /> : null}
    </div>
  )
}

export function UtilityBarQuickCreatePanel({ menu }: UtilityBarQuickCreatePanelProps) {
  const t = useTranslations("Dashboard.shell.utilityBar")
  const tPanel = useTranslations("Dashboard.shell.utilityBar.quickCreatePanel")
  const tNav = useTranslations("Dashboard.nav")
  const quickCreateOpen = useAppShellStore((s) => s.quickCreateOpen)
  const openQuickCreate = useAppShellStore((s) => s.openQuickCreate)
  const closeQuickCreate = useAppShellStore((s) => s.closeQuickCreate)
  const [view, setView] = useState<QuickCreateView>({ step: "pick" })
  const [formKey, setFormKey] = useState(0)

  function handleOpenChange(next: boolean) {
    if (next) {
      openQuickCreate()
      return
    }
    closeQuickCreate()
    setView({ step: "pick" })
    setFormKey((k) => k + 1)
  }

  return (
    <DropdownMenu open={quickCreateOpen} onOpenChange={handleOpenChange}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={t("quickCreate")}
              aria-expanded={quickCreateOpen}
              className={cn(
                APP_SHELL_UTILITY_L2_ICON_CLASS,
                APP_SHELL_UTILITY_L2_MENU_TRIGGER_OPEN_STATE_CLASS
              )}
            >
              <span
                aria-hidden
                className="size-[15px] shrink-0 [&>svg]:size-full"
              >
                <PenLine strokeWidth={2} />
              </span>
            </button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom" align="center" sideOffset={8}>
          {t("quickCreateTooltip")}
        </TooltipContent>
      </Tooltip>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className={cn("w-96 p-0", APP_SHELL_UTILITY_RAIL_MENU_SURFACE_CLASS)}
      >
        <div className="shrink-0 border-b border-border/50 px-4 py-3">
          <p className="text-xs font-semibold tracking-tight text-card-foreground">
            {tPanel("title")}
          </p>
          <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
            {tPanel("description")}
          </p>
        </div>

        {view.step === "pick" ? (
          <div className="max-h-[min(24rem,70vh)] overflow-y-auto px-4 py-4">
            {GROUP_ORDER.map((group) => {
              const rows = groupEntries(menu.entries, group)
              if (rows.length === 0) return null
              return (
                <section key={group} className="mb-4 last:mb-0">
                  <p className="mb-2 text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
                    {tPanel(`groups.${group}`)}
                  </p>
                  <div className="divide-y divide-border/50">
                    {rows.map((entry) =>
                      entry.kind === "link" ? (
                        <Link
                          key={entry.id}
                          href={entry.href as Route}
                          className="block py-2 text-[11px] text-foreground transition-colors hover:text-primary"
                          onClick={() => handleOpenChange(false)}
                        >
                          {tNav(entry.labelKey as "contacts")}
                        </Link>
                      ) : (
                        <button
                          key={entry.id}
                          type="button"
                          className="block w-full py-2 text-left text-[11px] text-foreground transition-colors hover:text-primary"
                          onClick={() =>
                            setView({ step: "form", form: entry.kind })
                          }
                        >
                          {tPanel(`forms.${entry.kind}`)}
                        </button>
                      )
                    )}
                  </div>
                </section>
              )
            })}
          </div>
        ) : (
          <QuickCreateFormStep
            key={formKey}
            form={view.form}
            orgSlug={menu.orgSlug}
            onBack={() => setView({ step: "pick" })}
          />
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
