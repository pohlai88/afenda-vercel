import "server-only"

import { cache } from "react"

import { eq } from "drizzle-orm"

import { canActInOrganization } from "#lib/auth"
import { db } from "#lib/db"
import { neonAuthMember } from "#lib/db/schema-neon-auth"
import { APP_LOCALES } from "#lib/i18n/locales.shared"

import type { CapabilityViewerContext } from "../types"

/**
 * Builds the viewer context the resolver needs.
 *
 * Server-side fields (`isAdmin`, `multiOrg`) hit the DB once per
 * request and are wrapped in `React.cache` keyed on the input tuple
 * so multiple calls within the same RSC subtree dedupe.
 *
 * `isMobile` is intentionally `false` on the server — capabilities
 * gated by `mobileOnly: true` get filtered to `unavailable` in RSC.
 * The L1 utility bar's right rail re-evaluates client-side so a
 * touch device still sees mobile-only widgets at runtime; the
 * marketplace catalog (the only RSC consumer of this resolver) only
 * needs to know what is *generally* available, not what each viewport
 * is currently rendering.
 *
 * `multiLocale` is a static decision based on the deployed
 * `APP_LOCALES` tuple; flipping the app to multi-locale automatically
 * unlocks locale-only capabilities.
 */
export const buildCapabilityViewerContext = cache(
  async (input: {
    userId: string
    userRole: string | null
    organizationId: string
  }): Promise<CapabilityViewerContext> => {
    const [isAdmin, memberRows] = await Promise.all([
      canActInOrganization(
        input.userId,
        input.userRole,
        input.organizationId,
        "admin"
      ),
      db
        .select({ id: neonAuthMember.id })
        .from(neonAuthMember)
        .where(eq(neonAuthMember.userId, input.userId))
        .limit(2),
    ])
    return {
      isAdmin,
      isMobile: false,
      multiOrg: memberRows.length > 1,
      multiLocale: APP_LOCALES.length > 1,
    }
  }
)
