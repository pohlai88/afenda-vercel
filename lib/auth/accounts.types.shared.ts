/**
 * Serializable linked-account shape for server props and client UI (no DB imports).
 */
export type SafeLinkedAccount = {
  id: string
  providerId: string
  accountId: string
  createdAt: Date
  isCredentialAccount: boolean
}
