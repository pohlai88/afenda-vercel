"use client"

/**
 * Browser auth client for Neon Auth (managed Better Auth).
 *
 * Set `NEXT_PUBLIC_AUTH_URL` to the app auth proxy base, e.g.
 * `https://example.com/api/auth` (see `.env.config.example` § Neon Auth).
 */
import { createAuthClient } from "@neondatabase/auth/next"

import { resolvePostAuthCallbackUrl } from "#lib/auth/callback-path"

export const authClient = createAuthClient()

export {
  AUTH_CLIENT_ERROR_CODE,
  normalizeAuthClientError,
  type NormalizedAuthClientError,
} from "#lib/auth/auth-client-error.shared"

export { resolvePostAuthCallbackUrl }
