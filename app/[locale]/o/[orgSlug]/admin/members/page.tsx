import {
  fetchOrgWorkbenchMembers,
  fetchOrgWorkbenchPendingInvitations,
} from "#lib/auth"
import { requireOrgSession } from "#lib/tenant"

import { OrganizationAdminClient } from "../../../../account/organization/organization-admin-client"

export default async function OrgAdminMembersPage() {
  const orgSession = await requireOrgSession()
  const [members, invitations] = await Promise.all([
    fetchOrgWorkbenchMembers(orgSession.organizationId),
    fetchOrgWorkbenchPendingInvitations(orgSession.organizationId),
  ])

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">
          Members & invitations
        </h2>
        <p className="text-sm text-muted-foreground">
          Invite colleagues, manage roles, and cancel pending invitations.
        </p>
      </div>
      <OrganizationAdminClient
        members={members}
        invitations={invitations}
        currentUserId={orgSession.userId}
      />
    </div>
  )
}
