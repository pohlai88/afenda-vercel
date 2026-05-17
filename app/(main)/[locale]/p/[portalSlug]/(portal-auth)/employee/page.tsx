import { redirect } from "next/navigation"

import { ensureAppLocale, toLocalePath } from "#lib/i18n/locales.shared"
import { employeePortalPath } from "#lib/portal"

type EmployeePortalIndexPageProps = {
  params: Promise<{ locale: string; portalSlug: string }>
}

export default async function EmployeePortalIndexPage({
  params,
}: EmployeePortalIndexPageProps) {
  const { locale: rawLocale, portalSlug } = await params
  const locale = ensureAppLocale(rawLocale)
  redirect(toLocalePath(locale, employeePortalPath(portalSlug, "leave")))
}
