import type { Route } from "next"

import { DEFAULT_APP_LOCALE, toLocalePath } from "./locales.shared"

/**
 * Default-locale marketing home under `localePrefix: "always"` (e.g. `/en`).
 * Use from root `app/not-found`, `app/error`, and `app/global-error` where
 * `#i18n/navigation` is unavailable (outside `[locale]` layout).
 */
export const DEFAULT_LOCALE_HOME_PATH = toLocalePath(
  DEFAULT_APP_LOCALE,
  "/"
) as Route
