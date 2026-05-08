import "server-only"

import { cache } from "react"
import type { Route } from "next"
import { redirect } from "next/navigation"
import { and, eq } from "drizzle-orm"

import { db } from "#lib/db"
import { neonAuthMember, neonAuthOrganization } from "#lib/db/schema-neon-auth"
import { getRequestAppLocale } from "#lib/i18n/request-locale.server"
import { toLocalePath } from "#lib/i18n/locales.shared"

import { isGlobalAdminUser } from "#lib/auth/permission.server"

import { auth } from "./server"

export type SignedInSession = {
  userId: string
  sessionId: string
  user: {
    email: string
    name: string | null
    role: string | null
    emailVerified: boolean
  }
}

export type OrgSession = SignedInSession & {
  organizationId: string
}

async function redirectSignIn(): Promise<never> {
  const locale = await getRequestAppLocale()
  redirect(toLocalePath(locale, "/sign-in") as Route)
}

export async function requireSignedInSession(): Promise<SignedInSession> {
  const { data: session } = await auth.getSession()
  if (!session?.user?.id || !session.session?.id) {
    return await redirectSignIn()
  }

  return {
    userId: session.user.id,
    sessionId: session.session.id,
    user: {
      email: session.user.email,
      name: session.user.name ?? null,
      role: (session.user as { role?: string | null }).role ?? null,
      emailVerified: Boolean(
        (session.user as { emailVerified?: boolean }).emailVerified
      ),
    },
  }
}

export async function requireGlobalAdminSession(): Promise<SignedInSession> {
  const signed = await requireSignedInSession()
  if (!isGlobalAdminUser(signed.userId, signed.user.role)) {
    const locale = await getRequestAppLocale()
    redirect(toLocalePath(locale, "/") as Route)
  }
  return signed
}

export const requireOrgSession = cache(
  async (orgSlug?: string): Promise<OrgSession> => {
    const signed = await requireSignedInSession()
    let organizationId: string | null =
      (
        (await auth.getSession()).data?.session as {
          activeOrganizationId?: string | null
        }
      )?.activeOrganizationId ?? null

    if (orgSlug) {
      const [org] = await db
        .select({ id: neonAuthOrganization.id })
        .from(neonAuthOrganization)
        .where(eq(neonAuthOrganization.slug, orgSlug))
        .limit(1)
      organizationId = org?.id ?? null
    }

    if (!organizationId) {
      return await redirectSignIn()
    }

    const [membership] = await db
      .select({ id: neonAuthMember.id })
      .from(neonAuthMember)
      .where(
        and(
          eq(neonAuthMember.userId, signed.userId),
          eq(neonAuthMember.organizationId, organizationId)
        )
      )
      .limit(1)

    if (!membership) {
      return await redirectSignIn()
    }

    return { ...signed, organizationId }
  }
)
