import "server-only"

import type { Route } from "next"
import { getTranslations } from "next-intl/server"

import { Link } from "#i18n/navigation"

import { listConsolePendingInvitesForEmail } from "../data/console-pending-invites.server"

type Props = {
  userEmail: string
}

export async function ConsolePendingInvitesSection({ userEmail }: Props) {
  const rows = await listConsolePendingInvitesForEmail(userEmail)

  if (rows.length === 0) return null

  const t = await getTranslations("Console.bootstrap.invites")

  return (
    <section className="mb-8 w-full max-w-lg rounded-lg border border-border/80 bg-card p-4 shadow-elevation-1">
      <h2 className="text-sm font-semibold tracking-tight">{t("title")}</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        {t("subtitle", { email: userEmail })}
      </p>
      <ul className="mt-3 space-y-2">
        {rows.map((row) => (
          <li
            key={row.id}
            className="flex flex-col gap-1 rounded-md border px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <span className="font-medium">{row.orgName}</span>
              <span className="block text-xs text-muted-foreground">
                {t("expires", {
                  date: row.expiresAt.toLocaleDateString(),
                })}
              </span>
            </div>
            <Link
              href={
                `/accept-invitation?invitationId=${encodeURIComponent(row.id)}` as Route
              }
              className="text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              {t("review")}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
