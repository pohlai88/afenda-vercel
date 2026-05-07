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

export { resolvePostAuthCallbackUrl } from "#lib/auth/callback-path"
export {
  AUTH_CLIENT_ERROR_CODE,
  normalizeAuthClientError,
  type NormalizedAuthClientError,
} from "#lib/auth/auth-client-error.shared"

const infraClientPlugins =
  process.env.NEXT_PUBLIC_BETTER_AUTH_INFRA === "1"
    ? [
        dashClient(),
        ...(process.env.NEXT_PUBLIC_BETTER_AUTH_INFRA_SENTINEL === "1"
          ? [sentinelClient({ autoSolveChallenge: true })]
          : []),
      ]
    : []

export const authClient = createAuthClient({
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
