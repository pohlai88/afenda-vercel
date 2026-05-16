"use client"

import { Languages } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "#components/ui/dropdown-menu"
import { LocaleSwitchLink } from "#i18n/locale-switch-link.client"
import {
  APP_LOCALES,
  ensureAppLocale,
  type AppLocale,
} from "#lib/i18n/locales.shared"
import { cn } from "#lib/utils"

import { WORKBENCH_UTILITY_ROUND_CONTROL_CLASS } from "../workbench-utility-round-control-class"
import { WorkbenchUtilityTriggerTooltip } from "./workbench-utility-trigger-tooltip"

function localeMenuMessageKey(
  loc: AppLocale
): "option.en" | "option.zhCN" | "option.vi" | "option.ms" {
  if (loc === "zh-CN") return "option.zhCN"
  return `option.${loc}` as "option.en" | "option.vi" | "option.ms"
}

/** Locale switcher (Languages icon). Lists {@link APP_LOCALES}; with a single locale the menu still opens to show the active language. */
export function WorkbenchUtilityLocaleMenu() {
  const active = ensureAppLocale(useLocale())
  const t = useTranslations("Dashboard.shell.utilityBar.locale")

  return (
    <DropdownMenu>
      <WorkbenchUtilityTriggerTooltip tooltip={t("tooltip")}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={t("trigger")}
            className={cn(WORKBENCH_UTILITY_ROUND_CONTROL_CLASS, "relative")}
          >
            <Languages
              className="size-[15px] shrink-0"
              aria-hidden
              strokeWidth={2}
            />
          </button>
        </DropdownMenuTrigger>
      </WorkbenchUtilityTriggerTooltip>

      <DropdownMenuContent align="end" className="min-w-[10rem]">
        {APP_LOCALES.map((loc) => (
          <DropdownMenuItem key={loc} asChild>
            <LocaleSwitchLink
              locale={loc}
              className="flex cursor-pointer items-center"
              aria-current={loc === active ? "true" : undefined}
            >
              {t(localeMenuMessageKey(loc))}
              {loc === active ? (
                <span className="ml-auto text-[10px] text-muted-foreground">
                  ✓
                </span>
              ) : null}
            </LocaleSwitchLink>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
