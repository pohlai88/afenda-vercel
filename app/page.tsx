import type { Route } from "next"
import { redirect } from "next/navigation"

import { DEFAULT_APP_LOCALE } from "#lib/i18n/locales.shared"

/** Marketing + product routes live under `/{locale}/…` (`localePrefix: "always"`). */
export default function RootPage() {
  redirect(`/${DEFAULT_APP_LOCALE}` as Route)
}
