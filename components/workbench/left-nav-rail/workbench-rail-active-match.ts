import type { WorkbenchRailNavItem } from "./workbench-rail.schema"

/**
 * Decide whether a `WorkbenchRailNavItem` should render as active for the
 * given `pathname`.
 *
 * Resolution order:
 *
 *   1. Caller-forced flag (`item.active`) wins — used when authority lives
 *      in route data the rail cannot see (search params, modal stacks).
 *   2. Otherwise: every pattern in `[item.href, ...item.activePatterns]`
 *      is tested using `item.match` (default `"prefix"`).
 *
 * Prefix matching uses **path-segment** boundaries: `/orbit` matches
 * `/orbit` and `/orbit/queue` but NOT `/orbit-2` or `/orbital`. This
 * fixes the long-standing class of "wrong active sibling" bugs that
 * naive `startsWith(href + "/")` checks already mostly avoided, while
 * also accepting an exact match on `href` itself (no trailing slash).
 *
 * Patterns that are not absolute pathnames (e.g. external URLs starting
 * with `http`) never match — the rail navigates to them, but no
 * pathname will equal them.
 *
 * Likewise, inferred active state never matches `?query` or `#fragment`
 * targets. The rail reads `usePathname()`, so it cannot reliably
 * distinguish `/security#sessions` from `/security#security`, nor
 * `/orbit?lifecycle=blocked` from `/orbit`. Callers that need an active
 * cue for those links must provide `active` explicitly.
 */
export function isWorkbenchRailNavItemActive(
  item: Pick<
    WorkbenchRailNavItem,
    "active" | "href" | "match" | "activePatterns"
  >,
  pathname: string
): boolean {
  if (item.active !== undefined) return item.active

  const match = item.match ?? "prefix"
  const patterns = [item.href, ...(item.activePatterns ?? [])]

  return patterns.some((pattern) => matchPathPattern(pathname, pattern, match))
}

function matchPathPattern(
  pathname: string,
  pattern: string,
  match: "exact" | "prefix"
): boolean {
  if (!pathname || !pattern) return false
  if (isExternalUrl(pattern)) return false
  if (hasSearchOrHash(pattern)) return false

  const cleanPathname = normalizePath(pathname)
  const cleanPattern = normalizePath(pattern)

  if (cleanPathname === cleanPattern) return true
  if (match === "exact") return false

  return cleanPathname.startsWith(`${cleanPattern}/`)
}

function normalizePath(value: string): string {
  if (value === "/") return "/"

  const [pathname] = value.split(/[?#]/)
  const normalized = pathname.replace(/\/+$/, "")

  return normalized || "/"
}

function isExternalUrl(value: string): boolean {
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(value)
}

function hasSearchOrHash(value: string): boolean {
  return value.includes("?") || value.includes("#")
}
