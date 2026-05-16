"use client"

import type { ComponentProps, ReactNode } from "react"

import { Link, usePathname } from "#i18n/navigation"
import type { AppLocale } from "#lib/i18n/locales.shared"

type LocaleSwitchLinkProps = {
  locale: AppLocale
  children: ReactNode
  className?: string
  replace?: boolean
  scroll?: boolean
} & Omit<ComponentProps<typeof Link>, "href" | "locale" | "children">

/**
 * Locale switch via declarative navigation — avoids imperative `router.replace`
 * before the App Router client runtime is ready (Next.js 16).
 */
export function LocaleSwitchLink({
  locale,
  children,
  className,
  replace = true,
  scroll = false,
  ...linkProps
}: LocaleSwitchLinkProps) {
  const pathname = usePathname()

  return (
    <Link
      href={pathname}
      locale={locale}
      replace={replace}
      scroll={scroll}
      prefetch={false}
      className={className}
      {...linkProps}
    >
      {children}
    </Link>
  )
}
