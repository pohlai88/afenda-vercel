import { getTranslations } from "next-intl/server"

import { GovernedPatternCListSection } from "#features/governed-surface"
import type { OrgAdminInvitationRow } from "#features/org-admin"

import { buildOrgAdminPendingInvitationsListSurfaceConfiguration } from "../data/org-admin-members-list-surface.server"

import {
  localizeOrgAdminRole,
  OrgAdminCancelInvitationButton,
} from "./organization-admin-member-actions.client"

type OrgAdminPendingInvitationsListSectionProps = {
  invitations: readonly OrgAdminInvitationRow[]
}

export async function OrgAdminPendingInvitationsListSection({
  invitations,
}: OrgAdminPendingInvitationsListSectionProps) {
  const [tPending, tInvite] = await Promise.all([
    getTranslations("OrgAdmin.pending"),
    getTranslations("OrgAdmin.invite"),
  ])

  const listConfiguration = buildOrgAdminPendingInvitationsListSurfaceConfiguration(
    invitations,
    {
      empty: tPending("empty"),
      colEmail: "Email",
      colMeta: "Details",
      formatMeta: (invitation) =>
        tPending("metaRoleAndExpiry", {
          role: localizeOrgAdminRole(invitation.role ?? "member", tInvite),
          expiresAt: invitation.expiresAt,
        }),
    }
  )

  return (
    <GovernedPatternCListSection
      layout="embedded"
      title=""
      listConfiguration={listConfiguration}
      surfaceKey="org-admin:members:pending-invitations"
      resolveConfiguredPermission={false}
      trailingColumn={{
        header: "Actions",
        render: (surfaceRow) => (
          <OrgAdminCancelInvitationButton invitationId={surfaceRow.id} />
        ),
      }}
    />
  )
}
