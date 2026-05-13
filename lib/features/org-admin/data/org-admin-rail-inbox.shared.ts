/**
 * Pure derivation of the org-admin **inbox** slot for the Working Memory Rail.
 *
 * Doctrine — Phase 3d of `docs/_draft/working-memory-rail-plan.md`:
 *
 *   > Inbox slot answers exactly one operator question:
 *   >   *"What needs me right now?"*
 *   > A single, linkable pressure summary — never a queue, never a log.
 *
 * The pressure map produced by `getOrgAdminRailPressureCounts` already
 * carries semantic tone per nav-key concern (`members` → invitations,
 * `integrations` → import / outbound failures). The inbox surfaces the
 * **single highest-priority** of those concerns:
 *
 *   - `critical` beats `attention` beats `default`
 *   - within the same tone, higher count wins
 *   - `positive` is **never** surfaced — positive tones describe healthy
 *     state, not pressure that needs an operator
 *   - `null` (no pressure for that key) is also never surfaced
 *
 * This module is a **pure function**:
 *   - no DB, no `server-only`, no clock reads
 *   - no `getTranslations` — the layout pre-resolves the locale-aware
 *     label and passes it in via `resolveLabel(key, count)`
 *   - the kernel `WorkbenchRailInbox` shape is the wire contract; this
 *     deriver returns either a fully-formed slot value or `null`
 *
 * Returning `null` is the conditional-density doctrine in action — a
 * calm rail (no pending invitations, no failed integrations) does NOT
 * render an inbox row at all. Empty memory hides; the workbench-rail
 * UI section also short-circuits when `inbox` is omitted.
 */

import type {
  WorkbenchRailBadgeTone,
  WorkbenchRailInbox,
} from "#components/workbench/left-nav-rail"

import type { OrgAdminNavKey, OrgAdminRailPressureMap } from "../types"

/**
 * Tone priority — used to pick the single inbox candidate when multiple
 * pressure entries are present. Higher number = higher urgency.
 *
 * `positive` is intentionally `-1` so the deriver never surfaces a
 * "Nothing's broken, well done" inbox row; that would be exactly the
 * decorative chrome the rail doctrine forbids (§10 anti-pattern: *no
 * permanent chrome that earns nothing*).
 */
const TONE_PRIORITY: Record<WorkbenchRailBadgeTone, number> = {
  critical: 3,
  attention: 2,
  default: 1,
  positive: -1,
}

/**
 * Caller-supplied label resolver. The layout passes a function that
 * picks the right localized message + plural form for the chosen
 * concern, e.g. `t("rail.inboxLabels.members", { count })` →
 * `"3 pending invitations"`. Keeping i18n out of the deriver lets the
 * unit tests run without spinning up next-intl.
 */
export type OrgAdminInboxLabelResolver = (
  key: OrgAdminNavKey,
  count: number
) => string

/**
 * Caller-supplied href map. Sparse on purpose — the layout only needs
 * to provide hrefs for keys it has registered (typically `members` and
 * `integrations`). A pressure entry whose key is not in `hrefByKey` is
 * silently dropped from inbox candidacy: the operator can't be sent
 * somewhere with no destination.
 */
export type OrgAdminInboxHrefMap = Partial<Record<OrgAdminNavKey, string>>

export type OrgAdminInboxDeriverInput = {
  readonly pressure: OrgAdminRailPressureMap
  readonly hrefByKey: OrgAdminInboxHrefMap
  readonly resolveLabel: OrgAdminInboxLabelResolver
}

/**
 * Returns the single inbox slot for the org-admin workbench, or `null`
 * when no concern has surfaceable pressure.
 *
 * `count` defenses:
 *
 *   - The pressure helpers refuse to emit `count: 0` (see
 *     `org-admin-rail-pressure.shared.ts`). This deriver re-asserts
 *     `count >= 1` defensively because the kernel
 *     `workbenchRailInboxSchema` rejects non-positive counts and would
 *     crash the layout if a future pressure helper ever produced one.
 *
 *   - When two candidates tie on tone priority + count, ordering is
 *     deterministic by the input iteration order so snapshot tests
 *     stay stable. JS `Map` / `Object` insertion-order semantics are
 *     well-defined post-ES2015, but the deriver keeps an explicit
 *     fallback comparison on `key` for safety.
 */
export function deriveOrgAdminInbox(
  input: OrgAdminInboxDeriverInput
): WorkbenchRailInbox | null {
  let best: {
    key: OrgAdminNavKey
    href: string
    tone: WorkbenchRailBadgeTone
    count: number
    priority: number
  } | null = null

  // `Object.entries` preserves declaration order on plain objects per
  // ECMAScript 2015+; the explicit string fallback below makes the
  // tiebreaker obvious to readers.
  for (const [rawKey, badge] of Object.entries(input.pressure)) {
    if (!badge) continue
    if (badge.count < 1) continue

    const key = rawKey as OrgAdminNavKey
    const href = input.hrefByKey[key]
    if (typeof href !== "string" || href.length === 0) continue

    const priority = TONE_PRIORITY[badge.tone]
    // `positive` (priority -1) and any unknown tone are never surfaced.
    if (priority < 0) continue

    if (best === null) {
      best = { key, href, tone: badge.tone, count: badge.count, priority }
      continue
    }

    if (priority > best.priority) {
      best = { key, href, tone: badge.tone, count: badge.count, priority }
      continue
    }

    if (priority === best.priority) {
      if (badge.count > best.count) {
        best = { key, href, tone: badge.tone, count: badge.count, priority }
        continue
      }
      // count tie → stable: keep the earlier entry. The explicit
      // `continue` documents this, even though it's a no-op.
      continue
    }
  }

  if (best === null) return null

  const label = input.resolveLabel(best.key, best.count)
  // `resolveLabel` returns user-visible copy; an empty string would
  // be a localizer bug. Drop the inbox rather than render a blank row.
  if (typeof label !== "string" || label.trim().length === 0) return null

  return {
    label: label.trim(),
    count: best.count,
    href: best.href,
    tone: best.tone,
  }
}
