/** Normalizes Neon Auth / Better Auth API error payloads for user-facing copy. */
export function neonAuthErrorMessage(
  err: {
    message?: string
    statusText?: string
  } | null
): string {
  const message = err?.message?.trim()
  if (message) return message
  const statusText = err?.statusText?.trim()
  if (statusText) return statusText
  return "Something went wrong."
}
