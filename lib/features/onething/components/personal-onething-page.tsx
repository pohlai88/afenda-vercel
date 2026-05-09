import { getTranslations } from "next-intl/server"

import { requireAuthShellSignedInSession } from "#lib/auth"
import type { AppLocale } from "#lib/i18n/locales.shared"

import { rankOneThingForCanvas } from "../data/onething-rank.server"
import {
  buildPersonalOneThingCaptureSeedParts,
  parseOneThingCanvasSearchParams,
  resolveOneThingCanvasWithFocusOverride,
} from "../data/onething-page-view.shared"
import { ensureDefaultOneThingListForUser } from "../data/onething.mutations.server"
import { listOneThingForList } from "../data/onething.queries.server"
import { OneThingShell } from "./onething-shell"

/**
 * Personal OneThing page — same shell, narrower action surface.
 *
 * The personal scope intentionally exposes fewer toolbar actions (no
 * snooze / reopen / comment / purge) — that policy lives inside the shell's
 * `scope === "personal"` branch.
 */
export async function PersonalOneThingPage({
  searchParams,
  locale,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
  locale: AppLocale
}) {
  const t = await getTranslations("Dashboard.OneThing")
  const session = await requireAuthShellSignedInSession()

  const defaultListId = await ensureDefaultOneThingListForUser(session.userId)
  const onething = await listOneThingForList(
    defaultListId,
    null,
    session.userId
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

  const captureParts = buildPersonalOneThingCaptureSeedParts({ locale, runId })
  const composerSeed = {
    linkage: captureParts.linkageJson,
    provenance: captureParts.provenanceJson,
  }

  return (
    <OneThingShell
      scope="personal"
      ranked={ranked.ranked}
      canvas={canvas}
      whyNow={whyNow}
      defaultListId={defaultListId}
      composerSeed={composerSeed}
      linkSearchParams={params}
    />
  )
}
