import { auth } from "#lib/auth"

/** Session cookies and OAuth callbacks must not be statically cached. */
export const dynamic = "force-dynamic"

export const { GET, POST, PUT, DELETE, PATCH } = auth.handler()
