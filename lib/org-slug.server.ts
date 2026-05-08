import "server-only"

import { randomBytes } from "node:crypto"

import { eq } from "drizzle-orm"

import { db } from "#lib/db"
import { neonAuthOrganization } from "#lib/db/schema-neon-auth"
import {
  isReservedOrgSlug,
  slugifyOrganizationName,
} from "#lib/org-slug-generate.shared"
import {
  normalizeOrgSlugParam,
  ORG_SLUG_MAX_LENGTH,
} from "#lib/org-slug.shared"

export async function getOrganizationSlugById(
  organizationId: string
): Promise<string | null> {
  const [row] = await db
    .select({ slug: neonAuthOrganization.slug })
    .from(neonAuthOrganization)
    .where(eq(neonAuthOrganization.id, organizationId))
    .limit(1)
  return row?.slug ?? null
}

export async function getOrganizationIdBySlug(
  slug: string
): Promise<string | null> {
  const normalized = normalizeOrgSlugParam(slug)
  if (!normalized) {
    return null
  }
  const [row] = await db
    .select({ id: neonAuthOrganization.id })
    .from(neonAuthOrganization)
    .where(eq(neonAuthOrganization.slug, normalized))
    .limit(1)
  return row?.id ?? null
}

export async function isOrganizationSlugTaken(
  slug: string,
  excludeOrganizationId?: string
): Promise<boolean> {
  const normalized = normalizeOrgSlugParam(slug)
  if (!normalized) {
    return true
  }

  const [row] = await db
    .select({ id: neonAuthOrganization.id })
    .from(neonAuthOrganization)
    .where(eq(neonAuthOrganization.slug, normalized))
    .limit(1)

  if (!row) return false
  if (excludeOrganizationId && row.id === excludeOrganizationId) {
    return false
  }
  return true
}

function randomSlugSuffix(): string {
  return randomBytes(4).toString("hex").slice(0, 8)
}

/**
 * Hybrid slug: derive from organization name unless {@link preferredSlug} is set.
 * Reserves collision-safe suffixes when the base is taken (globally unique in `neon_auth.organization.slug`).
 */
export async function allocateUniqueOrganizationSlug(options: {
  organizationName: string
  preferredSlug?: string | null
  excludeOrganizationId?: string
}): Promise<{ slug: string; adjustedFromPreferred: boolean }> {
  const { organizationName, preferredSlug, excludeOrganizationId } = options

  let baseRaw: string
  let adjustedFromPreferred = false

  if (preferredSlug?.trim()) {
    const normalized = normalizeOrgSlugParam(preferredSlug.trim())
    if (!normalized) {
      throw new Error("INVALID_SLUG")
    }
    if (isReservedOrgSlug(normalized)) {
      const bumped =
        normalizeOrgSlugParam(`${normalized}-org`) ?? "workspace-org"
      baseRaw = bumped
      adjustedFromPreferred = true
    } else {
      baseRaw = normalized
    }
  } else {
    const slugified = slugifyOrganizationName(organizationName)
    let normalized =
      normalizeOrgSlugParam(slugified) ??
      normalizeOrgSlugParam("workspace") ??
      "workspace"
    if (isReservedOrgSlug(normalized)) {
      normalized = normalizeOrgSlugParam(`${normalized}-org`) ?? "workspace-org"
    }
    baseRaw = normalized
  }

  const trySlug = async (candidate: string): Promise<boolean> => {
    const n = normalizeOrgSlugParam(candidate)
    if (!n || isReservedOrgSlug(n)) return false
    return !(await isOrganizationSlugTaken(n, excludeOrganizationId))
  }

  if (await trySlug(baseRaw)) {
    return {
      slug: normalizeOrgSlugParam(baseRaw)!,
      adjustedFromPreferred,
    }
  }

  adjustedFromPreferred = true

  for (let i = 2; i <= 500; i++) {
    const candidate = `${baseRaw}-${i}`
    if (await trySlug(candidate)) {
      return {
        slug: normalizeOrgSlugParam(candidate)!,
        adjustedFromPreferred: true,
      }
    }
  }

  for (let attempt = 0; attempt < 40; attempt++) {
    const suffix = randomSlugSuffix()
    const maxBase = ORG_SLUG_MAX_LENGTH - suffix.length - 1
    const shortenedBase =
      baseRaw.length > maxBase
        ? baseRaw.slice(0, Math.max(1, maxBase))
        : baseRaw
    const candidate = `${shortenedBase}-${suffix}`
    if (await trySlug(candidate)) {
      return {
        slug: normalizeOrgSlugParam(candidate)!,
        adjustedFromPreferred: true,
      }
    }
  }

  throw new Error("SLUG_ALLOCATION_EXHAUSTED")
}
