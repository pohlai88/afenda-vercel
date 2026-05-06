"use server"

import { revalidatePath } from "next/cache"
import { headers } from "next/headers"
import { z } from "zod"

import { auth } from "#lib/auth/config.server"
import { requireVerifiedEmailForAccount } from "#lib/auth/policy.server"

const securityPath = "/account/security"

const tokenSchema = z.string().trim().min(1).max(512)
const passkeyIdSchema = z.string().trim().min(1).max(512)

export async function revokeSessionAction(token: string) {
  const parsed = tokenSchema.parse(token)
  await requireVerifiedEmailForAccount(securityPath)
  await auth.api.revokeSession({
    body: { token: parsed },
    headers: await headers(),
  })
  revalidatePath(securityPath)
}

export async function revokeOtherSessionsAction() {
  await requireVerifiedEmailForAccount(securityPath)
  await auth.api.revokeOtherSessions({
    headers: await headers(),
  })
  revalidatePath(securityPath)
}

export async function deletePasskeyAction(id: string) {
  const parsed = passkeyIdSchema.parse(id)
  await requireVerifiedEmailForAccount(securityPath)
  await auth.api.deletePasskey({
    body: { id: parsed },
    headers: await headers(),
  })
  revalidatePath(securityPath)
}
