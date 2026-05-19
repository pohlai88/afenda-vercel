import "server-only"

import type { ReactNode } from "react"
import { getTranslations } from "next-intl/server"

import { AppShell, buildAppShellConsoleUtilityBarSlots } from "#app-shell"
import { requireSignedInSession } from "#lib/auth"
import type { AppLocale } from "#lib/i18n/locales.shared"
import type { RouteEnvelope } from "#lib/erp/route-envelope.shared"

type Props = {
  children: ReactNode
  locale: AppLocale
}

/** Tier A console shell — signed-in session gate + utility bar. */
export async function ConsoleDeferredShell({ children, locale }: Props) {
  const session = await requireSignedInSession()
  const tConsole = await getTranslations("Console")

  const envelope: RouteEnvelope = {
    surface: "console",
    locale,
  }

  const utilityBar = await buildAppShellConsoleUtilityBarSlots({
    locale,
    userEmail: session.user.email,
  })

  return (
    <AppShell
      envelope={envelope}
      skipToMainLabel={tConsole("skipToMain")}
      utilityBar={utilityBar}
      rail={null}
    >
      {children}
    </AppShell>
  )
}
