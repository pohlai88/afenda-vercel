import "server-only"

import { cache } from "react"
import { headers } from "next/headers"

import { auth } from "#lib/auth"

/** Per-request dedupe of Better Auth session reads (React cache). */
export const getAuthSession = cache(async () =>
  auth.api.getSession({ headers: await headers() }),
)
