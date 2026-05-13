/** Field-level validation messages keyed by form field name. */
export type ActionFieldErrors = Record<string, string | undefined>

/**
 * Canonical Server Action return envelope for forms — expected failures are
 * data, not thrown exceptions (see Next.js App Router mutation guidance).
 */
export type ActionResult<T = void> =
  | { ok: true; data?: T }
  | {
      ok: false
      error: string
      fieldErrors?: ActionFieldErrors
      code?: string
    }

export function isActionResultSuccess<T>(
  result: ActionResult<T>
): result is { ok: true; data?: T } {
  return result.ok === true
}

export function isActionFailure<T>(
  result: ActionResult<T> | null | undefined
): result is Extract<ActionResult<T>, { ok: false }> {
  return result?.ok === false
}
