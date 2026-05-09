import { Children, isValidElement, type ReactNode } from "react"
import type { Route } from "next"

import { Link } from "#i18n/navigation"
import { cn } from "#lib/utils"

/**
 * A single link inside {@link AuthFooterLinks}.
 * Inherits the shared `text-xs font-medium underline-offset-4 hover:text-foreground` contract.
 */
export function AuthFooterLink({
  href,
  children,
}: {
  href: Route | string
  children: ReactNode
}) {
  return (
    <Link
      href={href as Route}
      className="font-medium underline-offset-4 hover:text-foreground"
    >
      {children}
    </Link>
  )
}

/**
 * Footer row for auth cards — renders {@link AuthFooterLink} children
 * separated by a mid-dot (·). Drop into any `<CardFooter className="border-t pt-6">`.
 */
export function AuthFooterLinks({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  const items = Children.toArray(children).filter(isValidElement)
  return (
    <p
      className={cn(
        "w-full text-center text-xs text-muted-foreground",
        className
      )}
    >
      {items.map((item, i) => (
        <span key={i}>
          {i > 0 ? " · " : null}
          {item}
        </span>
      ))}
    </p>
  )
}
