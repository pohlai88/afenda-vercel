import "server-only"

import type { Route } from "next"
import { getTranslations } from "next-intl/server"

import { toLocalePath } from "#lib/i18n/locales.shared"
import type { AppLocale } from "#lib/i18n/locales.shared"
import { platformPath } from "#features/platform-admin"

import type { AppShellUtilityBarSlots } from "../appshell-props.shared"
import { AppShellBrandDisc } from "../top-utils-bar/appshell-utility-bar.client"
import { AppShellUtilityBarCommandSearchTrigger } from "../top-utils-bar/appshell-utility-bar-command.client"
import { AppShellUtilityBarRight } from "../top-utils-bar/appshell-utility-bar-right.client"

export type BuildAppShellPlatformUtilityBarSlotsInput = {
  locale: AppLocale
  userEmail: string
}

export async function buildAppShellPlatformUtilityBarSlots({
  locale,
  userEmail,
}: BuildAppShellPlatformUtilityBarSlotsInput): Promise<AppShellUtilityBarSlots> {
  const t = await getTranslations("PlatformAdmin")

  return {
    left: (
      <AppShellBrandDisc
        href={toLocalePath(locale, platformPath()) as Route}
        ariaLabel={t("shell.title")}
        tooltip={t("shell.title")}
      />
    ),
    center: (
      <AppShellUtilityBarCommandSearchTrigger
        placeholder={t("shell.subtitle")}
        triggerAriaLabel={t("nav.aria")}
      />
    ),
    right: (
      <AppShellUtilityBarRight
        account={{
          userEmail,
          hrefs: {
            account: toLocalePath(locale, "/account") as Route,
            identity: toLocalePath(locale, "/account/identity") as Route,
            security: toLocalePath(locale, "/account/security") as Route,
          },
          workspaceHomeHref: toLocalePath(locale, platformPath()) as Route,
        }}
      />
    ),
  }
}
