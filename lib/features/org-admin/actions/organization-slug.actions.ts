"use server"

import { revalidatePath } from "next/cache"
import { headers } from "next/headers"
import { z } from "zod"

import { auth, writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { requireTenantAuthority } from "#features/erp-rbac/server"
import {
  allocateUniqueOrganizationSlug,
  getOrganizationSlugById,
} from "#lib/auth/org-slug.server"
import {
  toLocaleOrgAdminRevalidatePattern,
  toLocaleOrgAppsRevalidatePattern,
  toLocaleOrgNexusRevalidatePattern,
} from "#lib/i18n/locales.shared"
import { requireSignedInSession } from "#lib/auth"
import type { requireOrgSession } from "#lib/auth"

const nameSchema = z
  .string()
  .trim()
  .min(1, "Enter an organization name.")
  .max(200)
const optionalSlugSchema = z.string().trim().max(128).optional().nullable()

const prepareInputSchema = z.object({
  organizationName: nameSchema,
  preferredSlug: optionalSlugSchema,
})

const newSlugSchema = z.string().trim().min(1, "Enter a URL slug.").max(128)

type OrgUpdateResult = { data?: unknown; error?: { message?: string } | null }

type AuthWithOrgUpdate = {
  organization?: {
    update?: (args: {
      organizationId: string
      data: { slug: string }
    }) => Promise<OrgUpdateResult>
  }
  api?: {
    updateOrganization?: (args: {
      body: Record<string, unknown>
      headers: Headers
    }) => Promise<OrgUpdateResult>
  }
}

async function callNeonAuthUpdateOrganization(input: {
  organizationId: string
  slug: string
}): Promise<OrgUpdateResult> {
  const h = await headers()
  const a = auth as unknown as AuthWithOrgUpdate
  if (a.organization?.update) {
    return a.organization.update({
      organizationId: input.organizationId,
      data: { slug: input.slug },
    })
  }
  if (a.api?.updateOrganization) {
    return a.api.updateOrganization({
      body: {
        organizationId: input.organizationId,
        data: { slug: input.slug },
      },
      headers: h,
    })
  }
  return {
    error: {
      message: "Organization update is not available from this server.",
    },
  }
}

function neonAuthErrorMessage(
  err: { message?: string } | null | undefined
): string {
  const m = err?.message?.trim()
  return m ?? "Something went wrong."
}

export type PrepareOrgSlugState =
  | { ok: true; slug: string; adjusted: boolean }
  | { ok: false; error: string }

/**
 * Allocates a globally unique slug before {@link authClient.organization.create}.
 */
export async function prepareOrganizationSlugAction(
  input: unknown
): Promise<PrepareOrgSlugState> {
  await requireSignedInSession()

  const parsed = prepareInputSchema.safeParse(input)
  if (!parsed.success) {
    const first = parsed.error.flatten().fieldErrors
    const msg =
      first.organizationName?.[0] ??
      first.preferredSlug?.[0] ??
      "Invalid input."
    return { ok: false, error: msg }
  }

  const { organizationName, preferredSlug } = parsed.data

  try {
    const { slug, adjustedFromPreferred } =
      await allocateUniqueOrganizationSlug({
        organizationName,
        preferredSlug: preferredSlug?.trim() ? preferredSlug : null,
      })
    return { ok: true, slug, adjusted: adjustedFromPreferred }
  } catch (e) {
    const msg = e instanceof Error ? e.message : ""
    if (msg === "INVALID_SLUG") {
      return {
        ok: false,
        error:
          "Use lowercase letters, numbers, hyphens, and underscores only (see URL slug rules).",
      }
    }
    if (msg === "SLUG_ALLOCATION_EXHAUSTED") {
      return {
        ok: false,
        error:
          "Could not allocate a unique workspace URL. Try a different name.",
      }
    }
    return {
      ok: false,
      error: "Could not prepare workspace URL.",
    }
  }
}

export type UpdateOrganizationSlugState =
  | { ok: true; newSlug: string }
  | { ok: false; error: string }

function revalidateOrgRoutes() {
  revalidatePath(toLocaleOrgAdminRevalidatePattern(""), "layout")
  revalidatePath(toLocaleOrgAppsRevalidatePattern(""), "layout")
  revalidatePath(toLocaleOrgNexusRevalidatePattern(), "page")
}

async function requireOrgAdminActionSession() {
  const gate = await requireTenantAuthority([
    "tenant_owner",
    "tenant_key_admin",
    "tenant_support_admin",
  ])
  if (!gate.ok) {
    return {
      session: null as Awaited<ReturnType<typeof requireOrgSession>> | null,
      error: gate.error,
    }
  }
  return { session: gate.session, error: null as string | null }
}

/**
 * Rename workspace URL slug (Neon Auth organization.slug). Admin-only;
 * falls back to a unique suffix when the requested slug is taken.
 */
export async function updateOrganizationSlugAction(
  _prev: UpdateOrganizationSlugState | null,
  formData: FormData
): Promise<UpdateOrganizationSlugState> {
  const gate = await requireOrgAdminActionSession()
  if (gate.error || !gate.session) {
    return { ok: false, error: gate.error ?? "Unauthorized." }
  }
  const session = gate.session

  const parsedSlug = newSlugSchema.safeParse(formData.get("newSlug"))
  if (!parsedSlug.success) {
    return {
      ok: false,
      error: parsedSlug.error.flatten().formErrors[0] ?? "Invalid slug.",
    }
  }

  const currentSlug = await getOrganizationSlugById(session.organizationId)
  if (!currentSlug) {
    return { ok: false, error: "Organization not found." }
  }

  let allocated: { slug: string }
  try {
    allocated = await allocateUniqueOrganizationSlug({
      organizationName: parsedSlug.data,
      preferredSlug: parsedSlug.data,
      excludeOrganizationId: session.organizationId,
    })
  } catch {
    return { ok: false, error: "Could not validate workspace URL." }
  }

  if (allocated.slug === currentSlug) {
    return { ok: true, newSlug: currentSlug }
  }

  try {
    const result = await callNeonAuthUpdateOrganization({
      organizationId: session.organizationId,
      slug: allocated.slug,
    })
    if (result.error) {
      return { ok: false, error: neonAuthErrorMessage(result.error) }
    }

    await writeIamAuditEventFromNextHeaders({
      action: "org.profile.slug.update",
      actorUserId: session.userId,
      actorSessionId: session.sessionId,
      organizationId: session.organizationId,
      resourceType: "organization",
      resourceId: session.organizationId,
      metadata: {
        previousSlug: currentSlug,
        nextSlug: allocated.slug,
      },
    })

    revalidateOrgRoutes()
    return { ok: true, newSlug: allocated.slug }
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Something went wrong.",
    }
  }
}
