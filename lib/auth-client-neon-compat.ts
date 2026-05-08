"use client"

import { authClient } from "./auth-client"

/**
 * Neon `createAuthClient()` typings omit optional Better Auth plugin methods that may
 * still exist at runtime when enabled in the Neon Auth project.
 */
export const neonAuthClient = authClient as typeof authClient & {
  signIn: typeof authClient.signIn & {
    magicLink?: (args: {
      email: string
      callbackURL?: string
    }) => Promise<{ error?: { message: string } | null }>
    passkey?: (args: {
      autoFill?: boolean
      fetchOptions?: { onSuccess?: () => void }
    }) => Promise<void>
  }
  passkey?: {
    addPasskey?: (args: {
      name?: string
    }) => Promise<{ error?: { message: string } | null }>
  }
  twoFactor?: {
    enable: (args: { password?: string; issuer?: string }) => Promise<{
      data?: { totpURI?: string; backupCodes?: string[] }
      error?: { message: string } | null
    }>
    verifyTotp: (args: {
      code: string
    }) => Promise<{ error?: { message: string } | null }>
    disable: (args: {
      password?: string
    }) => Promise<{ error?: { message: string } | null }>
    generateBackupCodes: (args: Record<string, never>) => Promise<{
      data?: { backupCodes?: string[] }
      error?: { message: string } | null
    }>
  }
}
