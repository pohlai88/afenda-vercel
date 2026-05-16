"use client"

/** Surfaces unexpected client failures to the global error pipeline (browser `reportError`). */
export function reportHrmImportClientError(
  context: string,
  cause?: unknown
): void {
  if (typeof reportError !== "function") return
  if (cause instanceof Error) {
    reportError(new Error(context, { cause }))
    return
  }
  reportError(
    new Error(cause === undefined ? context : `${context}: ${String(cause)}`)
  )
}
