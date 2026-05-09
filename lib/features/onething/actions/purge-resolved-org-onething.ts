"use server"

import {
  canActInOrganization,
  requireRecentAuthStepUp,
  writeIamAuditEventFromNextHeaders,
} from "#lib/auth"
import { db } from "#lib/db"
import { oneThing } from "#lib/db/schema"
import { getRequestAppLocale } from "#lib/i18n/request-locale.server"
import { toLocalePath } from "#lib/i18n/locales.shared"
import { requireOrgSession } from "#lib/tenant"
import { and, eq, inArray } from "drizzle-orm"
import type { Route } from "next"

import { revalidateOrgOneThingDashboard } from "../data/onething-revalidate.server"

export async function purgeResolvedOrgOneThing(
  formData: FormData
): Promise<void> {
  const session = await requireOrgSession()
  const resumePath = String(
    formData.get("resumePath") ?? "/o/placeholder/dashboard/onething"
  )
  const locale = await getRequestAppLocale()
  await requireRecentAuthStepUp({
    returnTo: toLocalePath(locale, resumePath as Route) as unknown as string,
  })

  const allowed = await canActInOrganization(
    session.userId,
    session.user.role,
    session.organizationId,
    "admin"
  )
  if (!allowed) throw new Error("purgeResolvedOrgOneThing: admin role required")

  const deleted = await db
    .delete(oneThing)
    .where(
      and(
        eq(oneThing.organizationId, session.organizationId),
        inArray(oneThing.state, ["resolved", "deprecated"])
      )
    )
    .returning({ id: oneThing.id })

  await writeIamAuditEventFromNextHeaders({
    action: "erp.onething.consequence.delete",
    organizationId: session.organizationId,
    actorUserId: session.userId,
    actorSessionId: session.sessionId,
    resourceType: "onething",
    resourceId: "bulk",
    metadata: { purged: deleted.length },
  })

  revalidateOrgOneThingDashboard()
}
