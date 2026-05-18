import { notFound } from "next/navigation"

import { redirect } from "#i18n/navigation"

import { organizationNexusPath } from "#features/nexus"
import { bindRequestLocale } from "#lib/i18n/bind-request-locale.server"
import { getOrganizationSlugById } from "#lib/auth/org-slug.server"
import { getOrgTenantContext } from "#lib/auth"

/**
 * Canonical org resolver — `/{locale}/o` → `/{locale}/o/{slug}/nexus`.
 * Requires a session with an active org; redirects to the operational origin field.
 * See AGENTS.md §5 → Nexus runtime (org root).
 */
export default async function OrgResolverPage({
  params,
}: PageProps<"/[locale]/o">) {
  const { locale: localeRaw } = await params
  const locale = bindRequestLocale(localeRaw)
  const org = await getOrgTenantContext()
  const slug = await getOrganizationSlugById(org.organizationId)
  if (!slug) {
    notFound()
  }
  redirect({ href: organizationNexusPath(slug), locale })
}
