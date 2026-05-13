import { redirect } from "next/navigation"

import { ensureAppLocale, toLocalePath } from "#lib/i18n/locales.shared"

export default async function OrgAdminKnowledgePage({
  params,
}: PageProps<"/[locale]/o/[orgSlug]/admin/knowledge">) {
  const { locale: localeRaw, orgSlug } = await params
  const locale = ensureAppLocale(localeRaw)

  redirect(toLocalePath(locale, `/o/${orgSlug}/admin/knowledge/sources`))
}
