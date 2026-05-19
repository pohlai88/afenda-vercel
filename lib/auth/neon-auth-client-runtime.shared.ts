"use client"

import { authClient } from "#lib/auth-client"

/**
 * Neon Auth client with Email OTP + organization typings that `@neondatabase/auth`
 * may omit from generated types but expose at runtime when those plugins are enabled.
 *
 * IAM profile mutations use Server Actions — not this export. Auth-flow islands only.
 * See ADR-0034: no passkey, 2FA, or magicLink shims.
 */
export const neonAuthClient = authClient as typeof authClient & {
  signIn: typeof authClient.signIn & {
    emailOtp?: (args: {
      email: string
      otp: string
    }) => Promise<{ error?: { message: string } | null }>
  }
  emailOtp?: {
    sendVerificationOtp?: (args: {
      email: string
    }) => Promise<{ error?: { message: string } | null }>
    verifyEmail?: (args: {
      email: string
      otp: string
    }) => Promise<{ error?: { message: string } | null }>
  }
  organization?: {
    setActive?: (args: {
      organizationId: string
    }) => Promise<{ error?: { message: string } | null }>
  }
}
