import "server-only"

import type { Route } from "next"
import { getTranslations } from "next-intl/server"

import { toLocalePath } from "#lib/i18n/locales.shared"
import type { AppLocale } from "#lib/i18n/locales.shared"

import type { AppShellUtilityBarSlots } from "../appshell-props.shared"
import { AppShellBrandDisc } from "../top-utils-bar/appshell-utility-bar.client"
import { AppShellUtilityBarCommandSearchTrigger } from "../top-utils-bar/appshell-utility-bar-command.client"
import { AppShellUtilityBarRight } from "../top-utils-bar/appshell-utility-bar-right.client"

export type BuildAppShellConsoleUtilityBarSlotsInput = {
  locale: AppLocale
  userEmail: string
}

export async function buildAppShellConsoleUtilityBarSlots({
  locale,
  userEmail,
}: BuildAppShellConsoleUtilityBarSlotsInput): Promise<AppShellUtilityBarSlots> {
  const tConsole = await getTranslations("Console")

  return {
    left: (
      <AppShellBrandDisc
        href={toLocalePath(locale, "/console") as Route}
        ariaLabel={tConsole("topNav.brandHome")}
        tooltip={tConsole("topNav.surfaceLabel")}
      />
    ),
    center: (
      <AppShellUtilityBarCommandSearchTrigger
        placeholder={tConsole("topNav.surfaceLabel")}
        triggerAriaLabel={tConsole("topNav.menuTrigger")}
      />
    ),
    right: (
      <AppShellUtilityBarRight
        account={{
          userEmail,
          // Pre-org loading bay has no slug — Profile / Account / Security rows
          // are omitted (the menu still surfaces sign-out + workspace return).
          hrefs: {},
          workspaceHomeHref: toLocalePath(locale, "/console") as Route,
        }}
      />
    ),
  }
}
