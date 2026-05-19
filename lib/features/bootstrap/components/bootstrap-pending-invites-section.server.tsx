import "server-only"

import { getTranslations } from "next-intl/server"

import { BootstrapPendingInvites } from "#components2/bootstrap"

import { listBootstrapPendingInvitesForEmail } from "../data/bootstrap-pending-invites.server"

type Props = {
  userEmail: string
}

export async function BootstrapPendingInvitesSection({ userEmail }: Props) {
  const rows = await listBootstrapPendingInvitesForEmail(userEmail)
  const t = await getTranslations("Bootstrap.bootstrap.invites")

  return (
    <BootstrapPendingInvites
      rows={rows.map((row) => ({
        id: row.id,
        orgName: row.orgName,
        expiresLabel: t("expires", {
          date: row.expiresAt.toLocaleDateString(),
        }),
      }))}
      labels={{
        title: t("title"),
        subtitle: t("subtitle", { email: userEmail }),
        review: t("review"),
      }}
    />
  )
}
