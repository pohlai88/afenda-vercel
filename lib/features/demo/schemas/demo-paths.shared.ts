/** Locale-internal demo paths (`toLocalePath(locale, demoPath(...))`). */
export function demoPath(segment?: string): `/${string}` {
  if (!segment || segment.length === 0) {
    return "/demo"
  }
  const normalized = segment.replace(/^\/+/, "")
  return `/demo/${normalized}` as `/${string}`
}
