import "server-only"

import type { Route } from "next"
import { getTranslations } from "next-intl/server"
import { redirect } from "next/navigation"

import { BootstrapCreateOrgForm } from "#components2/bootstrap/bootstrap-create-org-form.client"
import { BootstrapFirstRunShell } from "#components2/bootstrap"
import { prepareOrganizationSlugAction } from "#features/org-admin/client"
import { requireSignedInSession } from "#lib/auth"
import { ensureAppLocale, toLocalePath } from "#lib/i18n/locales.shared"

import { resolvePostLoginOrgDispatch } from "../data/post-login-org-dispatch.server"
import { BootstrapPendingInvitesSection } from "./bootstrap-pending-invites-section.server"

type Props = {
  params: Promise<{ locale: string }>
}

/** First-run setup — pending invites + create organization (0 memberships). */
export default async function BootstrapSetupPage({ params }: Props) {
  const { locale: localeRaw } = await params
  const locale = ensureAppLocale(localeRaw)
  const dispatch = await resolvePostLoginOrgDispatch(locale)

  if (dispatch.kind === "redirect") {
    redirect(dispatch.href as Route)
  }
  if (dispatch.kind === "picker") {
    redirect(toLocalePath(locale, "/o") as Route)
  }

  const session = await requireSignedInSession()
  const t = await getTranslations("Bootstrap")

  return (
    <BootstrapFirstRunShell subtitle={t("subtitleNoOrgs")}>
      <BootstrapPendingInvitesSection userEmail={session.user.email} />
      <BootstrapCreateOrgForm
        prepareSlugAction={prepareOrganizationSlugAction}
      />
    </BootstrapFirstRunShell>
  )
}
