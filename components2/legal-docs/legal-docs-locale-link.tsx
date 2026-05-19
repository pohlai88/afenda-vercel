import type { AnchorHTMLAttributes, ReactNode } from "react"

import {
  type AppLocale,
  type AppPath,
  toLocalePath,
} from "#lib/i18n/locales.shared"

export function resolveLegalDocsLocaleHref(
  locale: AppLocale,
  href: string
): string {
  if (href.startsWith("mailto:") || href.startsWith("http")) {
    return href
  }

  return toLocalePath(locale, href as AppPath)
}

export function LegalDocsLocaleLink({
  locale,
  href,
  className,
  children,
  "aria-current": ariaCurrent,
  "aria-label": ariaLabel,
}: {
  locale: AppLocale
  href: string
  className?: string
  children: ReactNode
  "aria-current"?: AnchorHTMLAttributes<HTMLAnchorElement>["aria-current"]
  "aria-label"?: string
}) {
  const resolvedHref = resolveLegalDocsLocaleHref(locale, href)

  return (
    <a
      href={resolvedHref}
      className={className}
      aria-current={ariaCurrent}
      aria-label={ariaLabel}
      {...(href.startsWith("http")
        ? { target: "_blank", rel: "noopener noreferrer" }
        : {})}
    >
      {children}
    </a>
  )
}
