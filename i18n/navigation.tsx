import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ElementRef,
} from "react"
import { createNavigation } from "next-intl/navigation"

import { routing } from "./routing"

const {
  Link: IntlLink,
  redirect,
  usePathname,
  useRouter,
  getPathname,
} = createNavigation(routing)

type IntlLinkProps = ComponentPropsWithoutRef<typeof IntlLink>

/**
 * Locale-aware `Link` with **`prefetch` defaulting to `false`** so dynamic /
 * session-heavy RSC segments are not eagerly prefetched (Next.js App Router
 * linking guidance). Pass **`prefetch={true}`** to opt in for a specific nav.
 */
const Link = forwardRef<ElementRef<typeof IntlLink>, IntlLinkProps>(
  function Link({ prefetch, ...rest }, ref) {
    return <IntlLink ref={ref} prefetch={prefetch ?? false} {...rest} />
  }
)
Link.displayName = "Link"

export { Link, redirect, usePathname, useRouter, getPathname }
