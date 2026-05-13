import type { Metadata } from "next"
import { Suspense } from "react"

import { WorkbenchSubLayoutShellSkeleton } from "#components/workbench"
import { ensureAppLocale } from "#lib/i18n/locales.shared"
import { requireOrgSession } from "#lib/tenant"

import { generateAccountOverviewMetadata } from "../../../(iam)/account/account-metadata"
import { OrgAccountDeferredWorkbench } from "./_components/org-account-deferred-workbench"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  return generateAccountOverviewMetadata(Promise.resolve({ locale }))
}

export const dynamic = "force-dynamic"

export default async function OrganizationAccountLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string; orgSlug: string }>
}) {
  const { locale: localeRaw, orgSlug } = await params
  const locale = ensureAppLocale(localeRaw)
  const session = await requireOrgSession()

  return (
    <Suspense
      fallback={
        <WorkbenchSubLayoutShellSkeleton statusLabel="Loading account settings" />
      }
    >
      <OrgAccountDeferredWorkbench
        locale={locale}
        orgSlug={orgSlug}
        orgSession={session}
      >
        {children}
      </OrgAccountDeferredWorkbench>
    </Suspense>
  )
}
