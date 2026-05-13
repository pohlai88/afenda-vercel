"use client"

import { useEffect } from "react"

import { setUserCapabilityPreferenceAction } from "#features/marketplace/client"

const STORAGE_KEY = "afenda.WorkbenchUtilityBar.widgets.v1"
const MIGRATED_FLAG = "afenda.WorkbenchUtilityBar.widgets.migrated.v1"

/**
 * One-shot legacy migrator for the deprecated `localStorage`-backed
 * utility-bar visibility map.
 *
 * Behaviour:
 *
 *   1. On mount, check the `MIGRATED_FLAG` key. If set, do nothing —
 *      this device has already drained.
 *   2. Read `STORAGE_KEY`. Apply the `right.integrations` →
 *      `right.marketplace` rename inline (mirrors the pre-existing
 *      `migrateUtilityWidgetPrefs` rule so behaviour stays identical
 *      for anyone who customized before the rename).
 *   3. For each capability whose stored preference *differs* from the
 *      system default, call `setUserCapabilityPreferenceAction`. We
 *      do not push redundant `visible` rows because the resolver
 *      treats absence as the system default.
 *   4. Clear the legacy key and set the migration flag, regardless
 *      of how many rows were written. Even an empty payload should
 *      retire the localStorage entry on this browser.
 *
 * Renders nothing. Failures are swallowed silently — operators can
 * always re-set their preferences from `/{locale}/marketplace`.
 *
 * After one release with this in place, this component can collapse
 * to `null` and the localStorage code path is gone forever.
 */
export function WorkbenchUtilityWidgetMigrator() {
  useEffect(() => {
    if (typeof window === "undefined") return
    if (window.localStorage.getItem(MIGRATED_FLAG) === "1") return

    let raw: string | null = null
    try {
      raw = window.localStorage.getItem(STORAGE_KEY)
    } catch {
      raw = null
    }

    const finish = () => {
      try {
        window.localStorage.removeItem(STORAGE_KEY)
        window.localStorage.setItem(MIGRATED_FLAG, "1")
      } catch {
        /* ignore */
      }
    }

    if (!raw) {
      finish()
      return
    }

    let parsed: Record<string, boolean | undefined> = {}
    try {
      const decoded = JSON.parse(raw) as unknown
      if (decoded && typeof decoded === "object" && !Array.isArray(decoded)) {
        parsed = decoded as Record<string, boolean | undefined>
      }
    } catch {
      finish()
      return
    }

    const renamed = renameLegacyKeys(parsed)
    const entries = Object.entries(renamed).filter(
      ([, value]) => typeof value === "boolean"
    ) as Array<[string, boolean]>

    if (entries.length === 0) {
      finish()
      return
    }

    let cancelled = false
    void (async () => {
      for (const [capabilityId, visible] of entries) {
        if (cancelled) return
        try {
          await setUserCapabilityPreferenceAction({
            capabilityId,
            state: visible ? "visible" : "hidden",
          })
        } catch {
          // Drop this row but continue draining others; the user can
          // always reset from the marketplace.
        }
      }
      if (!cancelled) finish()
    })()

    return () => {
      cancelled = true
    }
  }, [])

  return null
}

function renameLegacyKeys(
  prefs: Record<string, boolean | undefined>
): Record<string, boolean | undefined> {
  if (!("right.integrations" in prefs)) return prefs
  const next: Record<string, boolean | undefined> = { ...prefs }
  const legacy = next["right.integrations"]
  delete next["right.integrations"]
  if (typeof legacy === "boolean" && !("right.marketplace" in next)) {
    next["right.marketplace"] = legacy
  }
  return next
}
