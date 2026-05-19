import type { Route } from "next"

import { Link } from "#i18n/navigation"

export type BootstrapPendingInvitePresentationRow = {
  id: string
  orgName: string
  expiresLabel: string
}

export function BootstrapPendingInvites({
  rows,
  labels,
}: {
  rows: readonly BootstrapPendingInvitePresentationRow[]
  labels: {
    title: string
    subtitle: string
    review: string
  }
}) {
  if (rows.length === 0) return null

  return (
    <section className="mb-8 w-full max-w-lg rounded-lg border border-border/80 bg-card p-4 shadow-elevation-1">
      <h2 className="text-sm font-semibold tracking-tight">{labels.title}</h2>
      <p className="mt-1 text-xs text-muted-foreground">{labels.subtitle}</p>
      <ul className="mt-3 space-y-2">
        {rows.map((row) => (
          <li
            key={row.id}
            className="flex flex-col gap-1 rounded-md border px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <span className="font-medium">{row.orgName}</span>
              <span className="block text-xs text-muted-foreground">
                {row.expiresLabel}
              </span>
            </div>
            <Link
              href={
                `/accept-invitation?invitationId=${encodeURIComponent(row.id)}` as Route
              }
              className="text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              {labels.review}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
