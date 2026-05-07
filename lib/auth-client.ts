import { dashClient, sentinelClient } from "@better-auth/infra/client"
import { passkeyClient } from "@better-auth/passkey/client"
import { createAuthClient } from "better-auth/react"
import {
  adminClient,
  emailOTPClient,
  magicLinkClient,
  organizationClient,
  twoFactorClient,
  usernameClient,
} from "better-auth/client/plugins"

import { getSiteUrl } from "#lib/site"

export { resolvePostAuthCallbackUrl } from "#lib/auth/callback-path"
export {
  AUTH_CLIENT_ERROR_CODE,
  normalizeAuthClientError,
  type NormalizedAuthClientError,
} from "#lib/auth/auth-client-error.shared"

const infraClientPlugins =
  process.env.NEXT_PUBLIC_BETTER_AUTH_INFRA === "1"
    ? [
        dashClient({
          // Dashboard plugin client — https://better-auth.com/docs/infrastructure/plugins/dashboard#client-configuration
          resolveUserId: ({ userId, user, session }) =>
            userId || user?.id || session?.user?.id || "",
        }),
        ...(process.env.NEXT_PUBLIC_BETTER_AUTH_INFRA_SENTINEL === "1"
          ? [sentinelClient({ autoSolveChallenge: true })]
          : []),
      ]
    : []

export const authClient = createAuthClient({
  baseURL: getSiteUrl(),
  plugins: [
    ...infraClientPlugins,
    organizationClient(),
    adminClient(),
    emailOTPClient(),
    magicLinkClient(),
    twoFactorClient(),
    usernameClient(),
    passkeyClient(),
  ],
  fetchOptions: {
    credentials: "include",
  },
})
