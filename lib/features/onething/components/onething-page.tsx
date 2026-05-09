import { getTranslations } from "next-intl/server"

import { canActInOrganization } from "#lib/auth"
import type { AppLocale } from "#lib/i18n/locales.shared"
import { requireOrgSession } from "#lib/tenant"

import { rankOneThingForCanvas } from "../data/onething-rank.server"
import {
  buildOrgOneThingCaptureSeedParts,
  parseOneThingCanvasSearchParams,
  resolveOneThingCanvasWithFocusOverride,
} from "../data/onething-page-view.shared"
import { ensureDefaultOneThingListForOrg } from "../data/onething.mutations.server"
import { listOneThingForList } from "../data/onething.queries.server"
import { OneThingShell } from "./onething-shell"

/**
 * Org OneThing page — RSC orchestrator.
 *
 * Owns: session gate, list bootstrap, ranker run, focus override, capture
 * seed assembly. The shell takes ranked rows + canvas pick + actions and
 * renders the two-pane document surface.
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

  const captureParts = buildOrgOneThingCaptureSeedParts({
    orgSlug,
    locale,
    runId,
  })
  const composerSeed = {
    linkage: captureParts.linkageJson,
    provenance: captureParts.provenanceJson,
  }

  return (
    <OneThingShell
      scope="org"
      ranked={ranked.ranked}
      canvas={canvas}
      whyNow={whyNow}
      defaultListId={defaultListId}
      canAdmin={canAdmin}
      composerSeed={composerSeed}
      linkSearchParams={params}
    />
  )
}
