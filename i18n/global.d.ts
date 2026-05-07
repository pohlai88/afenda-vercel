import type { AppLocale } from "../lib/i18n/locales.shared"
import type messages from "../messages/en.json"

import type { AppIntlFormats } from "./request"

declare module "next-intl" {
  interface AppConfig {
    Locale: AppLocale
    Messages: typeof messages
    Formats: AppIntlFormats
  }
}
