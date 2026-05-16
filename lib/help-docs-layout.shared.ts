import type { ReactNode } from "react"

import type { DocsLayoutProps } from "fumadocs-ui/layouts/notebook"

import type { AppLocale } from "#lib/i18n/locales.shared"
import { toLocalePath } from "#lib/i18n/locales.shared"
import { SITE_NAME } from "#lib/site"

export function helpDocsBaseLayoutOptions(
  locale: AppLocale,
  navTitle?: ReactNode
): Omit<DocsLayoutProps, "tree" | "children"> {
  return {
    nav: {
      title: navTitle ?? SITE_NAME,
      // Return to the locale-prefixed root so the brand link is never bare.
      url: toLocalePath(locale, "/"),
      mode: "top",
    },
    links: [
      {
        type: "button",
        text: "Open app",
        url: toLocalePath(locale, "/"),
        secondary: true,
      },
    ],
    sidebar: {
      defaultOpenLevel: 1,
      collapsible: true,
    },
    tabMode: "navbar",
  }
}
