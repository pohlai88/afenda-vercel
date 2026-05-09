"use client"

import { useCallback, useMemo } from "react"

import { useFocusNavigation } from "./use-focus-navigation"
import { ONETHING_FOCUS_COMPOSER_EVENT } from "./onething-shell-events"
import { pickNextRankedId } from "./pick-next-ranked-id.shared"
import type { RankedOneThing } from "../../data/onething-rank.shared"

/**
 * Resolve hand-off — preserve operational momentum across resolve / deprecate
 * / delete / complete transitions.
 *
 * Capture the next ranked id BEFORE the mutation fires; on success replace
 * `?focus=` with that next id so the operator stays in the queue.
 *
 * When the queue runs dry the focus is cleared and a `onething:focus-composer`
 * event is dispatched so the composer takes the cursor — operator's hands
 * stay in motion instead of landing in `OneThingDetailEmpty` with no obvious
 * next action.
 *
 * Pure client orchestration — the underlying Server Actions still own the
 * mutation, audit, and revalidation. This hook just steers focus.
 *
 * Selection logic lives in `pickNextRankedId` (`./pick-next-ranked-id.shared`)
 * so it can be unit-tested without mocking next-intl's router.
 */
export function useResolveWithFocusHandoff(options: {
  ranked: readonly RankedOneThing[]
  currentId: string | null
  pathname: string
  preserve: Record<string, string | string[] | undefined> | undefined
}) {
  const { ranked, currentId, pathname, preserve } = options
  const { focus, clear } = useFocusNavigation(pathname, preserve)

  const nextId = useMemo<string | null>(
    () => pickNextRankedId(ranked, currentId),
    [ranked, currentId]
  )

  const handOff = useCallback(() => {
    if (nextId) {
      focus(nextId)
      return
    }
    clear()
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event(ONETHING_FOCUS_COMPOSER_EVENT))
    }
  }, [nextId, focus, clear])

  return { nextId, handOff }
}
