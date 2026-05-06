import type { ReactNode } from "react"
import Link from "next/link"

import { AfendaBrandLockup } from "#components/afenda-brand"
import { requireSignedInSession } from "#lib/tenant"

export default async function AccountLayout({
  children,
}: {
  children: ReactNode
}) {
  await requireSignedInSession()
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <header className="mb-8 flex flex-col gap-2">
        <Link
          href="/dashboard"
          className="w-fit rounded-md outline-offset-4 focus-visible:outline-2 focus-visible:outline-ring"
        >
          <AfendaBrandLockup className="max-w-[240px]" />
        </Link>
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Account
        </p>
      </header>
      {children}
    </div>
  )
}
