import { getTranslations } from "next-intl/server"

import { AppShellCommandPalette } from "#app-shell/client"

import { ORBIT_PRIMARY_SURFACES, organizationOrbitPath } from "../constants"
import type { OrbitSurface } from "../planner-orbit-path.shared"

type OrbitCommandQuickLinkKey =
  | "blockedExecution"
  | "automationAttention"
  | "signalsAwaitingTriage"

type OrbitCommandQuickLink = {
  id: string
  surface: OrbitSurface
  query?: string
  translationKey: OrbitCommandQuickLinkKey
}

const ORBIT_COMMAND_QUICK_LINKS: readonly OrbitCommandQuickLink[] = [
  {
    id: "orbit-blocked-execution",
    surface: "queue",
    query: "lifecycle=blocked",
    translationKey: "blockedExecution",
  },
  {
    id: "orbit-automation-attention",
    surface: "triage",
    query: "automationState=attention",
    translationKey: "automationAttention",
  },
  {
    id: "orbit-signals-triage",
    surface: "triage",
    translationKey: "signalsAwaitingTriage",
  },
]

/**
 * Orbit command-palette overlay — Layer 2 (`#features/orbit/server`) owns the
 * surface registry, route assembly, and translation wiring. The route layout
 * (`app/.../apps/orbit/layout.tsx`) only mounts this component so PRIORITY #2
 * (ADR-0035) holds: `app/` keeps thin Layer 1 routing; `lib/features/orbit/`
 * keeps Layer 2 truth.
 *
 * @see docs/decisions/0035-three-layer-surface-ide-anti-drift.md
 */
export async function OrbitCommandLayer({ orgSlug }: { orgSlug: string }) {
  const t = await getTranslations("Dashboard.Orbit")

  type SurfaceKey =
    | `surfaces.${OrbitSurface}.label`
    | `surfaces.${OrbitSurface}.description`
  const tSurface = (key: SurfaceKey) => t(key as Parameters<typeof t>[0])

  type QuickLinkKey =
    | `commandQuickLinks.${OrbitCommandQuickLinkKey}.label`
    | `commandQuickLinks.${OrbitCommandQuickLinkKey}.description`
  const tQuickLink = (key: QuickLinkKey) => t(key as Parameters<typeof t>[0])

  const surfaceItems = ORBIT_PRIMARY_SURFACES.map((surface) => ({
    id: `orbit-${surface}`,
    label: tSurface(`surfaces.${surface}.label`),
    href: organizationOrbitPath(orgSlug, surface),
    description: tSurface(`surfaces.${surface}.description`),
  }))

  const quickLinkItems = ORBIT_COMMAND_QUICK_LINKS.map(
    ({ id, surface, query, translationKey }) => {
      const basePath = organizationOrbitPath(orgSlug, surface)
      return {
        id,
        label: tQuickLink(`commandQuickLinks.${translationKey}.label`),
        href: query ? `${basePath}?${query}` : basePath,
        description: tQuickLink(
          `commandQuickLinks.${translationKey}.description`
        ),
      }
    }
  )

  return (
    <AppShellCommandPalette
      dialogTitle={t("title")}
      dialogDescription={t("description")}
      sections={[
        { heading: t("title"), items: surfaceItems },
        { heading: t("eyebrow"), items: quickLinkItems },
      ]}
    />
  )
}
