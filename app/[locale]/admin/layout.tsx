import type { ReactNode } from "react"

import { AfendaBrandLockup } from "#components/afenda-brand"
import { Link } from "#i18n/navigation"
import { requireRecentAuthStepUp } from "#lib/auth"
import { ensureAppLocale, toLocalePath } from "#lib/i18n/locales.shared"
import { requireGlobalAdminSession } from "#lib/tenant"

export default async function AdminLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale: localeRaw } = await params
  const locale = ensureAppLocale(localeRaw)
  await requireGlobalAdminSession()
  await requireRecentAuthStepUp({ returnTo: toLocalePath(locale, "/admin") })
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
          Administration
        </p>
      </header>
      {children}
    </div>
  )
}
