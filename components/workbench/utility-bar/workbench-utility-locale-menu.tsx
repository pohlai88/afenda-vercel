"use client"

import { Languages } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "#components/ui/dropdown-menu"
import { usePathname, useRouter } from "#i18n/navigation"
import { APP_LOCALES, ensureAppLocale } from "#lib/i18n/locales.shared"
import { cn } from "#lib/utils"

import { WORKBENCH_UTILITY_ROUND_CONTROL_CLASS } from "./workbench-utility-round-control-class"
import { WorkbenchUtilityTriggerTooltip } from "./workbench-utility-trigger-tooltip"

/** Locale switcher (Languages icon). Lists {@link APP_LOCALES}; with a single locale the menu still opens to show the active language. */
export function WorkbenchUtilityLocaleMenu() {
  const pathname = usePathname()
  const router = useRouter()
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
          <DropdownMenuItem
            key={loc}
            onClick={() => {
              router.replace(pathname, { locale: loc })
            }}
          >
            {t(`option.${loc}`)}
            {loc === active ? (
              <span className="ml-auto text-[10px] text-muted-foreground">
                ✓
              </span>
            ) : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
