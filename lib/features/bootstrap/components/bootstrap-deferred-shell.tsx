import "server-only"

import type { ReactNode } from "react"
import { getTranslations } from "next-intl/server"

import { AppShell, buildAppShellBootstrapUtilityBarSlots } from "#app-shell"
import { requireSignedInSession } from "#lib/auth"
import type { AppLocale } from "#lib/i18n/locales.shared"
import type { RouteEnvelope } from "#lib/erp/route-envelope.shared"

type Props = {
  children: ReactNode
  locale: AppLocale
}

/** Tier A bootstrap shell — signed-in session gate + utility bar. */
export async function BootstrapDeferredShell({ children, locale }: Props) {
  const session = await requireSignedInSession()
  const tBootstrap = await getTranslations("Bootstrap")

  const envelope: RouteEnvelope = {
    surface: "bootstrap",
    locale,
  }

  const utilityBar = await buildAppShellBootstrapUtilityBarSlots({
    locale,
    userEmail: session.user.email,
  })

  return (
    <AppShell
      envelope={envelope}
      skipToMainLabel={tBootstrap("skipToMain")}
      utilityBar={utilityBar}
      rail={null}
    >
      {children}
    </AppShell>
  )
}
