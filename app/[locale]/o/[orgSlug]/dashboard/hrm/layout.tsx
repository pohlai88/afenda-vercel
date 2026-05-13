import { Suspense } from "react"

import { WorkbenchSubLayoutShellSkeleton } from "#components/workbench"
import { ensureAppLocale } from "#lib/i18n/locales.shared"
import { requireOrgSession } from "#lib/tenant"

import { OrgHrmDeferredWorkbench } from "./_components/org-hrm-deferred-workbench"

export const dynamic = "force-dynamic"

export default async function OrgDashboardHrmLayout({
  children,
  params,
}: LayoutProps<"/[locale]/o/[orgSlug]/dashboard/hrm">) {
  const { locale: localeRaw, orgSlug } = await params
  const locale = ensureAppLocale(localeRaw)

  const orgSession = await requireOrgSession()

  return (
    <Suspense
      fallback={
        <WorkbenchSubLayoutShellSkeleton statusLabel="Loading human resources" />
      }
    >
      <OrgHrmDeferredWorkbench
        locale={locale}
        orgSlug={orgSlug}
        orgSession={orgSession}
      >
        {children}
      </OrgHrmDeferredWorkbench>
    </Suspense>
  )
}
