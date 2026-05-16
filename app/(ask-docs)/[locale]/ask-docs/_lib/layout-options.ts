import type { ReactNode } from "react"

import type { DocsLayoutProps } from "fumadocs-ui/layouts/notebook"

import type { AppLocale } from "#lib/i18n/locales.shared"
import { toLocalePath } from "#lib/i18n/locales.shared"

/** Notebook layout: tabMode navbar + nav.mode top. Section tabs use root in ask-docs meta.json. */
export function askDocsBaseLayoutOptions(
  locale: AppLocale,
  navTitle: ReactNode
): Omit<DocsLayoutProps, "tree" | "children"> {
  const nav = {
    title: navTitle,
    url: toLocalePath(locale, "/ask-docs"),
    mode: "top" as const,
  }

  return {
    nav,
    tabMode: "navbar",
    links: [
      {
        type: "button",
        text: "Afenda home",
        url: toLocalePath(locale, "/"),
      },
    ],
    sidebar: {
      defaultOpenLevel: 1,
      collapsible: true,
    },
  }
}
