"use client"

import { useEffect } from "react"

import type { AppLocale } from "#lib/i18n/locales.shared"

/** Aligns `<html lang>` with the active `[locale]` segment without dynamic root layout. */
export function HtmlLangSync({ locale }: { locale: AppLocale }) {
  useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])
  return null
}
