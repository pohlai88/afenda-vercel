import { getTranslations, getFormatter } from "next-intl/server"

import { Link } from "#i18n/navigation"

import {
  organizationAdminPath,
  organizationDashboardPath,
} from "#lib/dashboard-module-paths"

import type { PlatformAdminOrganizationSummary } from "../types"

type Props = {
  organizations: readonly PlatformAdminOrganizationSummary[]
}

export async function PlatformAdminOrganizationsTable({
  organizations,
}: Props) {
  const t = await getTranslations("PlatformAdmin.organizations")
  const format = await getFormatter()

  if (organizations.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("empty")}</p>
  }

  return (
    <ul className="divide-y divide-border rounded-md border">
      {organizations.map((organization) => (
        <li
          key={organization.id}
          className="flex flex-col gap-1 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="min-w-0 space-y-0.5">
            <p className="truncate font-medium">{organization.name}</p>
            <p className="truncate text-xs text-muted-foreground">
              {t("slug", { slug: organization.slug })} ·{" "}
              {t("members", { count: organization.memberCount })} ·{" "}
              {format.dateTime(organization.createdAt, "short")}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href={organizationDashboardPath(organization.slug, "home")}
              className="text-xs font-medium text-primary underline-offset-4 hover:underline"
            >
              {t("openDashboard")}
            </Link>
            <Link
              href={organizationAdminPath(organization.slug, "overview")}
              className="text-xs font-medium text-primary underline-offset-4 hover:underline"
            >
              {t("openAdmin")}
            </Link>
          </div>
        </li>
      ))}
    </ul>
  )
}
