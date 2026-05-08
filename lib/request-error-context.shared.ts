/**
 * Shared shape for Next.js `Instrumentation.onRequestError` reporting (Pino + Sentry).
 * Keep free of secrets — no raw headers.
 */
export type NextRequestErrorReportContext = {
  digest?: string
  path: string
  method: string
  routeType: string
  routePath: string
  routerKind: string
  renderSource?: string
  revalidateReason?: string | undefined
}
