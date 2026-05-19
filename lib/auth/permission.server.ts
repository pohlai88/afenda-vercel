import "server-only"

function parseBetterAuthAdminUserIdsFromEnv(): string[] {
  const raw = process.env.BETTER_AUTH_ADMIN_USER_IDS?.trim()
  if (!raw) return []
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
}

/**
 * Global admin: `admin` appears in the user's `role` field (comma-separated)
 * or the user id is listed in `BETTER_AUTH_ADMIN_USER_IDS`.
 * Must stay aligned with `requireGlobalAdminSession` in `tenant-session.server.ts`.
 */
export function isGlobalAdminUser(
  userId: string,
  userRole: string | null | undefined
): boolean {
  const roles = String(userRole ?? "user")
    .split(",")
    .map((r) => r.trim())
    .filter(Boolean)
  if (roles.includes("admin")) return true
  return parseBetterAuthAdminUserIdsFromEnv().includes(userId)
}
