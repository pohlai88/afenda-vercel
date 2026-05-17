/**
 * Minimal, client-serializable helpers for tools Server Action branches.
 */

export function toolsActionFailure<
  const E extends Record<string, string | undefined>,
>(errors: E): { ok: false; errors: E } {
  return { ok: false, errors }
}
