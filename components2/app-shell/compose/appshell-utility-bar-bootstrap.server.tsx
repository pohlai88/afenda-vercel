import "server-only"

import type { Route } from "next"
import { getTranslations } from "next-intl/server"

import { toLocalePath } from "#lib/i18n/locales.shared"
import type { AppLocale } from "#lib/i18n/locales.shared"

import type { AppShellUtilityBarSlots } from "../appshell-props.shared"
import { AppShellBrandDisc } from "../top-utils-bar/appshell-utility-bar.client"
import { AppShellUtilityBarCommandSearchTrigger } from "../top-utils-bar/appshell-utility-bar-command.client"
import { AppShellUtilityBarRight } from "../top-utils-bar/appshell-utility-bar-right.client"

export type BuildAppShellBootstrapUtilityBarSlotsInput = {
  locale: AppLocale
  userEmail: string
}

export async function buildAppShellBootstrapUtilityBarSlots({
  locale,
  userEmail,
}: BuildAppShellBootstrapUtilityBarSlotsInput): Promise<AppShellUtilityBarSlots> {
  const tBootstrap = await getTranslations("Bootstrap")

  return {
    left: (
      <AppShellBrandDisc
        href={toLocalePath(locale, "/o") as Route}
        ariaLabel={tBootstrap("topNav.brandHome")}
        tooltip={tBootstrap("topNav.surfaceLabel")}
      />
    ),
    center: (
      <AppShellUtilityBarCommandSearchTrigger
        placeholder={tBootstrap("topNav.surfaceLabel")}
        triggerAriaLabel={tBootstrap("topNav.menuTrigger")}
      />
    ),
    right: (
      <AppShellUtilityBarRight
        account={{
          userEmail,
          hrefs: {},
          workspaceHomeHref: toLocalePath(locale, "/o") as Route,
        }}
      />
    ),
  }
}
