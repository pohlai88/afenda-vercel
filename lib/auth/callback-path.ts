const DEFAULT_POST_AUTH_PATH = "/onboarding"

/**
 * Resolve a post-auth redirect path from `callbackUrl` query (open-redirect safe).
 * Allows same-origin relative paths only (`/foo`, not `//evil` or `https:`).
 */
export function resolvePostAuthCallbackUrl(
  raw: string | null | undefined,
  fallback: string = DEFAULT_POST_AUTH_PATH
): string {
  if (raw == null || raw === "") return fallback
  const t = raw.trim()
  if (!t.startsWith("/") || t.startsWith("//")) return fallback
  if (t.includes("\n") || t.includes("\r")) return fallback
  if (/^[a-zA-Z][a-zA-Z+\-.]*:/.test(t)) return fallback
  return t
}
