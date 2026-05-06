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

export const authClient = createAuthClient({
  plugins: [
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
