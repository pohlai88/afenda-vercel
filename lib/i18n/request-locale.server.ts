import "server-only"

import { getLocale } from "next-intl/server"

import {
  DEFAULT_APP_LOCALE,
  isAppLocale,
  type AppLocale,
} from "./locales.shared"

/** `getLocale()` narrowed to `AppLocale` for server actions / guards without `[locale]` params. */
export async function getRequestAppLocale(): Promise<AppLocale> {
  const raw = await getLocale()
  return isAppLocale(raw) ? raw : DEFAULT_APP_LOCALE
}
