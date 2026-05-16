import type { AnchorHTMLAttributes, ReactNode } from "react"
import { vi } from "vitest"

vi.mock("#i18n/navigation", () => ({
  Link: ({
    href,
    children,
    prefetch: _prefetch,
    ...props
  }: AnchorHTMLAttributes<HTMLAnchorElement> & {
    href: string
    prefetch?: boolean
    children?: ReactNode
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))
