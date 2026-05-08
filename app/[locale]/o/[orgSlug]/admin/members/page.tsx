import { getTranslations } from "next-intl/server"

import { OrganizationAdminClient } from "#features/org-admin"

import {
  fetchOrgWorkbenchMembers,
  fetchOrgWorkbenchPendingInvitations,
} from "#lib/auth"
import { requireOrgSession } from "#lib/tenant"

export default async function OrgAdminMembersPage() {
  const orgSession = await requireOrgSession()
  const t = await getTranslations("OrgAdmin.members")
  const [members, invitations] = await Promise.all([
    fetchOrgWorkbenchMembers(orgSession.organizationId),
    fetchOrgWorkbenchPendingInvitations(orgSession.organizationId),
  ])

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">{t("title")}</h2>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </div>
      <OrganizationAdminClient
        members={members}
        invitations={invitations}
        currentUserId={orgSession.userId}
      />
    </div>
  )
}
