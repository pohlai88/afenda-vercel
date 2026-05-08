/**
 * OAuth provider ids derived from env only — no DB.
 * Keep sign-in and other public shells importable without initializing `#lib/db`.
 */
export function getEnabledSocialProviderIds(): string[] {
  const ids: string[] = []
  const ghId =
    process.env.GITHUB_CLIENT_ID?.trim() ||
    process.env.BETTER_AUTH_GITHUB_CLIENT_ID?.trim()
  const ghSecret =
    process.env.GITHUB_CLIENT_SECRET?.trim() ||
    process.env.BETTER_AUTH_GITHUB_CLIENT_SECRET?.trim()
  if (ghId && ghSecret) ids.push("github")

  const gId =
    process.env.GOOGLE_CLIENT_ID?.trim() ||
    process.env.BETTER_AUTH_GOOGLE_CLIENT_ID?.trim()
  const gSecret =
    process.env.GOOGLE_CLIENT_SECRET?.trim() ||
    process.env.BETTER_AUTH_GOOGLE_CLIENT_SECRET?.trim()
  if (gId && gSecret) ids.push("google")

  return ids
}
