import type { Route } from "next"
import type { AnchorHTMLAttributes, ReactNode } from "react"

import { Link } from "#i18n/navigation"

type MarketingPublicHrefProps = {
  readonly href: string
  readonly className?: string
  readonly children: ReactNode
  readonly "aria-current"?: AnchorHTMLAttributes<HTMLAnchorElement>["aria-current"]
  readonly "aria-label"?: string
}

function isExternalHref(href: string) {
  return href.startsWith("mailto:") || href.startsWith("http")
}

/** Locale-aware link for public marketing surfaces (internal app routes vs mailto/http). */
export function MarketingPublicHref({
  href,
  className,
  children,
  "aria-current": ariaCurrent,
  "aria-label": ariaLabel,
}: MarketingPublicHrefProps) {
  if (isExternalHref(href)) {
    return (
      <a
        href={href}
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

  return (
    <Link
      href={href as Route}
      className={className}
      aria-current={ariaCurrent}
      aria-label={ariaLabel}
    >
      {children}
    </Link>
  )
}
