import { Suspense } from "react"

import ConsoleLoading from "#components2/console/console-loading"
import { ConsoleOrgListSlot } from "#components2/console/console-org-list-slot"
import { ensureAppLocale } from "#lib/i18n/locales.shared"


export default async function ConsolePage({
  params,
}: PageProps<"/[locale]/console">) {
  const { locale: localeRaw } = await params
  const locale = ensureAppLocale(localeRaw)

  return (
    <Suspense fallback={<ConsoleLoading />}>
      <ConsoleOrgListSlot locale={locale} />
    </Suspense>
  )
}
