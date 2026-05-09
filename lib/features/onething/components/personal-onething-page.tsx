import { getTranslations } from "next-intl/server"

import { requireAuthShellSignedInSession } from "#lib/auth"
import type { AppLocale } from "#lib/i18n/locales.shared"

import { rankOneThingForCanvas } from "../data/onething-rank.server"
import {
  buildPersonalOneThingCaptureSeedParts,
  parseOneThingCanvasSearchParams,
  resolveOneThingCanvasWithFocusOverride,
  sliceOperationalOneThingTail,
} from "../data/onething-page-view.shared"
import { ensureDefaultOneThingListForUser } from "../data/onething.mutations.server"
import { listOneThingForList } from "../data/onething.queries.server"
import { OneThingCanvas } from "./onething-canvas"
import { OneThingTail } from "./onething-tail"

/**
 * Personal onething page — same canvas + tail primitives as the org page; the
 * party graph is "you" by default so the counter-party line and resolve
 * actions degrade gracefully. The personal page does not expose snooze /
 * reopen / comment / purge because the personal action surface is narrower
 * by design (see `lib/features/onething/actions/*-personal-onething.ts`).
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

  const tail = sliceOperationalOneThingTail(ranked.ranked, canvas?.id ?? null)
  const totalOpen = ranked.ranked.length

  const captureParts = buildPersonalOneThingCaptureSeedParts({ locale, runId })
  const captureSeed = {
    linkage: captureParts.linkageJson,
    provenance: captureParts.provenanceJson,
  }

  const captureSeedSummary = runId
    ? t("captureSeedPersonalRun", { runId, locale })
    : t("captureSeedPersonal", { locale })

  return (
    <div className="mx-auto max-w-5xl space-y-6 py-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          {t("personalTitle")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t("personalDescription")}
        </p>
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <OneThingCanvas
          scope="personal"
          canvas={canvas}
          whyNow={whyNow}
          defaultListId={defaultListId}
          captureSeed={captureSeed}
          captureSeedSummary={captureSeedSummary}
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
