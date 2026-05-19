import "server-only"

import type { Route } from "next"
import { getTranslations } from "next-intl/server"
import { redirect } from "next/navigation"

import { OrgDispatchPicker } from "#components2/bootstrap"
import { ensureAppLocale, toLocalePath } from "#lib/i18n/locales.shared"

import { resolvePostLoginOrgDispatch } from "../data/post-login-org-dispatch.server"

type Props = {
  params: Promise<{ locale: string }>
}

export default async function OrgDispatchPage({ params }: Props) {
  const { locale: localeRaw } = await params
  const locale = ensureAppLocale(localeRaw)
  const dispatch = await resolvePostLoginOrgDispatch(locale)

  if (dispatch.kind === "redirect") {
    redirect(dispatch.href as Route)
  }
  if (dispatch.kind === "bootstrap") {
    redirect(toLocalePath(locale, "/bootstrap") as Route)
  }

  const t = await getTranslations("Bootstrap")

  return (
    <OrgDispatchPicker
      orgs={dispatch.orgs}
      labels={{
        subtitle: t("subtitle"),
        orgsLabel: t("orgsLabel"),
        open: t("open"),
      }}
    />
  )
}
