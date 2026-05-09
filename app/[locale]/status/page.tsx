import type { Metadata } from "next"

import { StatusControlSurface } from "#components/marketing/status-control-surface"
import { resolveOpenStatusPublicSnapshot } from "#features/public-trust/server"
import { SITE_NAME, getSiteUrl } from "#lib/site"

export const dynamic = "force-dynamic"

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/status">): Promise<Metadata> {
  const { locale } = await params
  const configured = Boolean(process.env.OPENSTATUS_PUBLIC_STATUS_URL?.trim())
  const canonicalPath = `/${locale}/status`

  return {
    title: `Status | ${SITE_NAME}`,
    description:
      "Afenda public availability evidence surface, reflecting OpenStatus as the availability authority without a separate uptime claim.",
    alternates: {
      canonical: `${getSiteUrl().replace(/\/$/, "")}${canonicalPath}`,
    },
    robots: {
      index: configured,
      follow: configured,
    },
  }
}

export default async function StatusPage() {
  const snapshot = await resolveOpenStatusPublicSnapshot()

  return <StatusControlSurface snapshot={snapshot} />
}
