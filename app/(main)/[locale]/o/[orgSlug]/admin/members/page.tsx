import { getTranslations } from "next-intl/server"

import {
  OrgAdminMembersListSection,
  OrgAdminPendingInvitationsListSection,
  OrganizationAdminInviteSection,
} from "#features/org-admin"
import { recordOrgAdminPageVisit } from "#features/org-admin/server"
import { GovernedSurface } from "#features/governed-surface"

import {
  fetchOrgAdminMembers,
  fetchOrgAdminPendingInvitations,
} from "#features/org-admin/server"
import { getOrgTenantContext } from "#lib/auth"

export default async function OrgAdminMembersPage({
  params,
}: PageProps<"/[locale]/o/[orgSlug]/admin/members">) {
  const { orgSlug } = await params
  const orgSession = await getOrgTenantContext()
  const [t, tPending, tList, members, invitations] = await Promise.all([
    getTranslations("OrgAdmin.members"),
    getTranslations("OrgAdmin.pending"),
    getTranslations("OrgAdmin.memberList"),
    fetchOrgAdminMembers(orgSession.organizationId),
    fetchOrgAdminPendingInvitations(orgSession.organizationId),
  ])

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
      <div className="flex flex-col gap-8">
        <OrganizationAdminInviteSection />
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-medium">{tPending("title")}</h2>
          <OrgAdminPendingInvitationsListSection invitations={invitations} />
        </section>
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-medium">{tList("title")}</h2>
          <OrgAdminMembersListSection
            members={members}
            currentUserId={orgSession.userId}
          />
        </section>
      </div>
    </GovernedSurface>
  )
}
