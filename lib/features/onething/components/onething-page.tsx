import { getTranslations } from "next-intl/server"

import { ModulePageHeader } from "#components/dashboard/module-page-header"
import { canActInOrganization } from "#lib/auth"
import type { AppLocale } from "#lib/i18n/locales.shared"
import { requireOrgSession } from "#lib/tenant"

import { rankOneThingForCanvas } from "../data/onething-rank.server"
import {
  buildOrgOneThingCaptureSeedParts,
  parseOneThingCanvasSearchParams,
  resolveOneThingCanvasWithFocusOverride,
  sliceOperationalOneThingTail,
} from "../data/onething-page-view.shared"
import { ensureDefaultOneThingListForOrg } from "../data/onething.mutations.server"
import { listOneThingForList } from "../data/onething.queries.server"
import { OneThingCanvas } from "./onething-canvas"
import { OneThingTail } from "./onething-tail"

/**
 * Org onething page — composes the operational atom canvas with the ranked tail.
 *
 * The rank function is the source of truth for which atom is the canvas; a
 * `?focus=…` search param overrides the pick when the user clicks a tail
 * item. Both pages (org + personal) share the same canvas/tail primitives;
 * only the bound Server Actions and the party graph differ.
 */
export async function OneThingPage({
  searchParams,
  orgSlug,
  locale,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
  orgSlug: string
  locale: AppLocale
}) {
  const t = await getTranslations("Dashboard.OneThing")
  const org = await requireOrgSession()

  const canAdmin = await canActInOrganization(
    org.userId,
    org.user.role,
    org.organizationId,
    "admin"
  )

  const defaultListId = await ensureDefaultOneThingListForOrg(
    org.organizationId
  )
  const onething = await listOneThingForList(
    defaultListId,
    org.organizationId,
    null
  )

  const params = (await searchParams) ?? {}
  const { focusId, runId } = parseOneThingCanvasSearchParams(params)

  const ranked = rankOneThingForCanvas(onething)

  const focused = resolveOneThingCanvasWithFocusOverride({
    onething,
    rankedCanvas: ranked.canvas,
    rankedWhyNow: ranked.whyNow,
    focusId,
    focusWhyNowLabel: t("whyNowFocusOpened"),
  })
  const { canvas, whyNow } = focused

  const tail = sliceOperationalOneThingTail(ranked.ranked, canvas?.id ?? null)
  const totalOpen = ranked.ranked.length

  const captureParts = buildOrgOneThingCaptureSeedParts({
    orgSlug,
    locale,
    runId,
  })
  const captureSeed = {
    linkage: captureParts.linkageJson,
    provenance: captureParts.provenanceJson,
  }

  const captureSeedSummary = runId
    ? t("captureSeedOrgRun", { runId, slug: orgSlug, locale })
    : t("captureSeedOrg", { slug: orgSlug, locale })

  return (
    <div className="space-y-6">
      <ModulePageHeader
        title={t("title")}
        description={t("description")}
        eyebrow="Operations"
      />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <OneThingCanvas
          scope="org"
          canvas={canvas}
          whyNow={whyNow}
          defaultListId={defaultListId}
          captureSeed={captureSeed}
          captureSeedSummary={captureSeedSummary}
          canAdmin={canAdmin}
        />
        <OneThingTail
          items={tail}
          totalOpen={totalOpen}
          currentId={canvas?.id ?? null}
          linkSearchParams={params}
        />
      </div>
    </div>
  )
}
