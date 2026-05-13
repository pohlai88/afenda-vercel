/**
 * Minimal, client-serializable helpers for HRM Server Action branches.
 * Prefer these over repeating `{ ok: false, … }` object literals — not a generic action framework.
 */

export function hrmActionFailure<
  const E extends Record<string, string | undefined>,
>(errors: E): { ok: false; errors: E } {
  return { ok: false, errors }
}

export function hrmCodedActionFailure<const C extends string>(
  code: C,
  message: string
): { ok: false; code: C; message: string } {
  return { ok: false, code, message }
}

/**
 * Transaction-local failure shape; callers map `message` to `errors.form` (or similar) at the boundary.
 */
export function hrmTransactionFailure(message: string): {
  ok: false
  message: string
} {
  return { ok: false, message }
}
