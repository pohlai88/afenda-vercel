/** Public VAPID key for browser PushManager.subscribe (NEXT_PUBLIC_*). */
export function readOrgPushVapidPublicKey(): string | null {
  const raw = process.env.NEXT_PUBLIC_ORG_PUSH_VAPID_PUBLIC_KEY?.trim()
  return raw && raw.length > 0 ? raw : null
}

export function isOrgPushConfigured(): boolean {
  const publicKey = readOrgPushVapidPublicKey()
  const privateKey = process.env.ORG_PUSH_VAPID_PRIVATE_KEY?.trim()
  const subject = process.env.ORG_PUSH_VAPID_SUBJECT?.trim()
  return Boolean(publicKey && privateKey && subject)
}
