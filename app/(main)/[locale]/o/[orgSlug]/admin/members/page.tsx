import { getTranslations } from "next-intl/server"

import { OrganizationAdminClient } from "#features/org-admin"
import { recordOrgAdminPageVisit } from "#features/org-admin/server"
import { GovernedSurface } from "#features/governed-surface"

import {
  fetchOrgWorkbenchMembers,
  fetchOrgWorkbenchPendingInvitations,
} from "#lib/auth"
import { requireOrgSession } from "#lib/tenant"

export default async function OrgAdminMembersPage({
  params,
}: PageProps<"/[locale]/o/[orgSlug]/admin/members">) {
  const { orgSlug } = await params
  const orgSession = await requireOrgSession()
  const t = await getTranslations("OrgAdmin.members")
  const [members, invitations] = await Promise.all([
    fetchOrgWorkbenchMembers(orgSession.organizationId),
    fetchOrgWorkbenchPendingInvitations(orgSession.organizationId),
  ])

  // Working Memory Rail — record this page in the operator's recents.
  await recordOrgAdminPageVisit({
    orgSession,
    orgSlug,
    segment: "members",
  })

  return (
    <GovernedSurface
      header={{
        title: t("title"),
        description: t("description"),
      }}
    >
      <OrganizationAdminClient
        members={members}
        invitations={invitations}
        currentUserId={orgSession.userId}
      />
    </GovernedSurface>
  )
}
