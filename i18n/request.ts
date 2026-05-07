import "server-only"

import { IntlErrorCode } from "next-intl"
import { getRequestConfig } from "next-intl/server"

import { isAppLocale, type AppLocale } from "#lib/i18n/locales.shared"

import { routing } from "./routing"

/** Shared Intl formats for `next-intl` + `AppConfig` augmentation. */
export const formats = {
  dateTime: {
    short: {
      day: "numeric" as const,
      month: "short" as const,
      year: "numeric" as const,
    },
    long: {
      day: "numeric" as const,
      month: "long" as const,
      year: "numeric" as const,
      hour: "numeric" as const,
      minute: "numeric" as const,
    },
  },
  number: {
    currency: {
      style: "currency" as const,
      currency: "USD" as const,
    },
    percent: {
      style: "percent" as const,
      minimumFractionDigits: 2 as const,
    },
  },
} as const

export type AppIntlFormats = typeof formats

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale
  const locale: AppLocale =
    requested && isAppLocale(requested) ? requested : routing.defaultLocale

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
    timeZone: "UTC",
    formats,
    onError(error: { code: IntlErrorCode | (string & {}); message?: string }) {
      if (error.code === IntlErrorCode.MISSING_MESSAGE) {
        console.warn("[next-intl] missing message:", error.message)
      } else {
        console.error("[next-intl]", error)
      }
    },
    getMessageFallback({
      namespace,
      key,
    }: {
      namespace?: string
      key: string
    }) {
      return process.env.NODE_ENV !== "production"
        ? `[${namespace ?? "?"}.${key}]`
        : key
    },
  }
})
