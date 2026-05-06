import "server-only"

import { cache } from "react"
import { headers } from "next/headers"

import { auth } from "#lib/auth/config.server"

/** Active sessions for the current user (cookie session). */
export const listDeviceSessions = cache(async () => {
  const list = await auth.api.listSessions({
    headers: await headers(),
  })
  return list ?? []
})

/** Passkeys for the current user (passkey plugin). */
export const listUserPasskeys = cache(async () => {
  const list = await auth.api.listPasskeys({
    headers: await headers(),
  })
  return list ?? []
})
