"use client"

import type { ReactNode } from "react"
import type { Route } from "next"

import { Link } from "#i18n/navigation"

export type ListSurfaceRowLinkProps = {
  href: string
  children: ReactNode
  className?: string
}

export function ListSurfaceRowLink({
  href,
  children,
  className,
}: ListSurfaceRowLinkProps) {
  return (
    <Link href={href as Route} prefetch={false} className={className}>
      {children}
    </Link>
  )
}
