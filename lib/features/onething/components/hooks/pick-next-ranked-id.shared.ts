/**
 * Pure ranker-aware "next id" selector — extracted from
 * `useResolveWithFocusHandoff` so the operational-momentum invariant can
 * be unit-tested without mocking next-intl's router.
 *
 * Contract:
 *
 *   - When `currentId` is `null` (no row focused), the first ranked id is
 *     returned so a resolve-from-empty flow lands on the queue head.
 *   - When `currentId` is the **last** ranked item, the previous item is
 *     returned (so resolving the bottom of the queue moves the operator
 *     up, not into the empty state).
 *   - When `currentId` is **not** in `ranked` (it just got resolved
 *     server-side), the first ranked id is returned as a sane fallback.
 *   - When `ranked` is empty, `null` is returned. The caller is expected
 *     to dispatch `ONETHING_FOCUS_COMPOSER_EVENT` in that case.
 *
 * The selector is intentionally *positional*, not severity-aware. The
 * ranker has already applied severity and impact when it produced
 * `ranked`; the hand-off respects that order rather than recomputing.
 */

import type { RankedOneThing } from "../../data/onething-rank.shared"

export function pickNextRankedId(
  ranked: readonly RankedOneThing[],
  currentId: string | null
): string | null {
  if (ranked.length === 0) return null
  if (!currentId) return ranked[0]?.id ?? null

  const idx = ranked.findIndex((r) => r.id === currentId)
  if (idx === -1) return ranked[0]?.id ?? null

  const next = ranked[idx + 1] ?? ranked[idx - 1]
  return next?.id ?? null
}
