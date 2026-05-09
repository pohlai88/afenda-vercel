"use client"

import { useEffect, useMemo } from "react"

import { useTranslations } from "next-intl"

import { Button } from "#components/ui/button"
import { useIsMobile } from "#hooks/use-mobile"

import { usePathname } from "#i18n/navigation"

import {
  addOrgOneThingComment,
  completeOrgOneThing,
  completePersonalOneThing,
  createOrgOneThing,
  createPersonalOneThing,
  deleteOrgOneThing,
  deletePersonalOneThing,
  deprecateOrgOneThing,
  deprecatePersonalOneThing,
  purgeResolvedOrgOneThing,
  reopenOrgOneThing,
  resolveOrgOneThing,
  resolvePersonalOneThing,
  snoozeOrgOneThingOneHour,
  type OneThingRow,
  type OneThingTailPreserveSearchParams,
  type RankedOneThing,
} from "#features/onething/client"

import { useFocusNavigation } from "./hooks/use-focus-navigation"
import { useResolveWithFocusHandoff } from "./hooks/use-resolve-with-focus-handoff"
import { OneThingDetailEmpty } from "./onething-detail-empty"
import { OneThingDetailPane } from "./onething-detail-pane"
import { OneThingListPane } from "./onething-list-pane"
import type { OneThingDetailToolbarActions } from "./onething-detail-toolbar"

/**
 * OneThing two-pane shell — operational document computing.
 *
 * Composition:
 *
 *   ┌───────────────────────────────────────────────────────────┐
 *   │  list pane (composer + ranked rows)  │   detail pane      │
 *   │                                       │   (open document)  │
 *   └───────────────────────────────────────────────────────────┘
 *
 * Below `lg`, the shell collapses to a single pane: list-only by default;
 * picking a row slides the detail in-page (transform-only — no modal). A
 * "back" affordance returns the operator to the list.
 *
 * Keyboard map (only when not typing in an input):
 *
 *   - `j` / `↓` → focus next ranked row
 *   - `k` / `↑` → focus previous ranked row
 *   - `Esc`     → on mobile, close the detail pane and return to the list
 *
 * The shell never owns server state. All mutations route through the
 * client-safe Server Actions imported from `#features/onething/client`;
 * RSC owns the canvas pick / ranking / audit / revalidation.
 */

type OneThingShellProps = {
  scope: "org" | "personal"
  /** All ranked active rows (output of `rankOneThingForCanvas` → `ranked`). */
  ranked: readonly RankedOneThing[]
  /** Currently focused row, picked by the ranker or `?focus=` override. */
  canvas: OneThingRow | null
  /** Why this row was picked (already resolved server-side). */
  whyNow: string
  defaultListId: string
  /** Whether the actor can purge (org admin). */
  canAdmin?: boolean
  /** Pre-baked seed JSON the composer hands to the create action. */
  composerSeed?: {
    linkage?: string
    counterparty?: string
    provenance?: string
    impact?: string
  }
  /** Search params to preserve when mutating `?focus=` (e.g. `runId`). */
  linkSearchParams?: OneThingTailPreserveSearchParams
}

export function OneThingShell({
  scope,
  ranked,
  canvas,
  whyNow,
  defaultListId,
  canAdmin = false,
  composerSeed,
  linkSearchParams,
}: OneThingShellProps) {
  const t = useTranslations("Dashboard.OneThing")
  const pathname = usePathname()
  const isMobile = useIsMobile()

  const { focus, clear } = useFocusNavigation(pathname, linkSearchParams)
  const { handOff } = useResolveWithFocusHandoff({
    ranked,
    currentId: canvas?.id ?? null,
    pathname,
    preserve: linkSearchParams,
  })

  // Keyboard map (shell scope): J / K (or arrow keys) navigate the queue.
  // The composer (`N` / `C` / `Esc`) and the toolbar (`R` / `Esc` while a
  // resolve / comment / more expander is open) own their own keys via
  // local listeners — see `.cursor/rules/onething-directory.mdc`. Esc is
  // intentionally NOT bound here on mobile: the visible "Back" button in
  // the detail topbar is the canonical mobile affordance, and binding Esc
  // at the shell level would race the toolbar's Esc.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null
      const typing =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable
      if (typing) return

      if (e.key === "j" || e.key === "ArrowDown") {
        e.preventDefault()
        const idx = canvas?.id
          ? ranked.findIndex((r) => r.id === canvas.id)
          : -1
        const next = ranked[Math.max(0, Math.min(ranked.length - 1, idx + 1))]
        if (next) focus(next.id)
        return
      }
      if (e.key === "k" || e.key === "ArrowUp") {
        e.preventDefault()
        const idx = canvas?.id
          ? ranked.findIndex((r) => r.id === canvas.id)
          : ranked.length
        const prev = ranked[Math.max(0, Math.min(ranked.length - 1, idx - 1))]
        if (prev) focus(prev.id)
        return
      }
    }
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("keydown", onKey)
    }
  }, [ranked, canvas, focus])

  const composerActions = useMemo(
    () => ({
      scope,
      listId: defaultListId,
      linkageJson: composerSeed?.linkage,
      provenanceJson: composerSeed?.provenance,
      counterpartyJson: composerSeed?.counterparty,
      impactJson: composerSeed?.impact,
      create: scope === "personal" ? createPersonalOneThing : createOrgOneThing,
    }),
    [scope, defaultListId, composerSeed]
  )

  const toolbarActions: Omit<OneThingDetailToolbarActions, "resolveSeverity"> =
    useMemo(() => {
      if (scope === "personal") {
        return {
          scope,
          fastResolve: completePersonalOneThing,
          resolveOneThing: resolvePersonalOneThing,
          deprecateOneThing: deprecatePersonalOneThing,
          remove: deletePersonalOneThing,
          onResolveCommitted: handOff,
        }
      }
      return {
        scope,
        fastResolve: completeOrgOneThing,
        resolveOneThing: resolveOrgOneThing,
        deprecateOneThing: deprecateOrgOneThing,
        reopen: reopenOrgOneThing,
        snooze: snoozeOrgOneThingOneHour,
        remove: deleteOrgOneThing,
        addComment: addOrgOneThingComment,
        purge: canAdmin ? purgeResolvedOrgOneThing : undefined,
        onResolveCommitted: handOff,
      }
    }, [scope, canAdmin, handOff])

  const detailOpenOnMobile = isMobile && canvas != null

  return (
    <div className="relative flex h-[calc(100vh-var(--app-shell-topbar-height,4rem))] w-full overflow-hidden border-t border-border/40 bg-background">
      {/* List pane */}
      <aside
        className={`flex h-full w-full max-w-full flex-col border-border/40 lg:w-[340px] lg:max-w-[340px] lg:border-r ${
          detailOpenOnMobile ? "hidden lg:flex" : "flex"
        }`}
      >
        <OneThingListPane
          items={ranked}
          currentId={canvas?.id ?? null}
          composerActions={composerActions}
          onSelect={focus}
        />
      </aside>

      {/* Detail pane */}
      <section
        className={`flex h-full flex-1 flex-col overflow-y-auto bg-background ${
          detailOpenOnMobile
            ? "absolute inset-0 z-10 lg:static"
            : "hidden lg:flex"
        }`}
        aria-label={t("shell.detailLabel")}
      >
        {detailOpenOnMobile ? (
          <div className="flex shrink-0 items-center gap-2 border-b border-border/40 px-3 py-2 lg:hidden">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => clear()}
              className="h-7 px-2 text-xs"
            >
              {t("shell.backToList")}
            </Button>
          </div>
        ) : null}

        {canvas ? (
          <OneThingDetailPane
            canvas={canvas}
            whyNow={whyNow}
            toolbarActions={toolbarActions}
          />
        ) : (
          <OneThingDetailEmpty />
        )}
      </section>
    </div>
  )
}
