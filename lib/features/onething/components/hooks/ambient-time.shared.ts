/**
 * Ambient time formatter — shared by the OneThing list pane, detail pane,
 * and audit footer.
 *
 * ## Why the narrow `AmbientTimeT` type?
 *
 * `ReturnType<typeof useTranslations>` (the un-narrowed form) forces TypeScript
 * to instantiate the *entire* next-intl message-type graph on every file that
 * uses it as a parameter type.  For files that consume `AppConfig.Messages`
 * (typed as `typeof messages` from `en.json`) this can cost 10–14 s per file
 * during a cold `tsc --noEmit` run.
 *
 * The fix is a structural type that names **only** the four literal message keys
 * actually called by `formatAmbientTime`.  TypeScript's function-parameter
 * contravariance rule then requires:
 *
 *   `AmbientTimeKey ⊆ NamespacedMessageKeys<Messages, "Dashboard.OneThing">`
 *
 * …which is TRUE — all four keys exist in the namespace — so the narrowed
 * `t` from `useTranslations("Dashboard.OneThing")` is assignable to
 * `AmbientTimeT` without forcing the compiler to expand the whole message tree.
 */

/** The four message keys called by {@link formatAmbientTime}. */
type AmbientTimeKey =
  | "shell.ambientTimeJustNow"
  | "shell.ambientTimeMinutes"
  | "shell.ambientTimeHours"
  | "shell.ambientTimeDays"

/**
 * Narrow structural callable — replaces `ReturnType<typeof useTranslations>`.
 * Values are typed as `Record<string, number>` because all three
 * parameterised keys pass a single numeric counter (`m`, `h`, or `d`).
 */
export type AmbientTimeT = (
  key: AmbientTimeKey,
  values?: Record<string, number>
) => string

export const HOUR_MS = 60 * 60 * 1000
export const DAY_MS = 24 * HOUR_MS

/**
 * Converts milliseconds elapsed since an event into a compact ambient string:
 * `"just now"` · `"Xm"` · `"Xh"` · `"Xd"`.
 *
 * Delegates copy to `t` so the caller's locale is respected.
 */
export function formatAmbientTime(msAgo: number, t: AmbientTimeT): string {
  if (msAgo < 60_000) return t("shell.ambientTimeJustNow")
  if (msAgo < HOUR_MS) {
    const m = Math.max(1, Math.round(msAgo / 60_000))
    return t("shell.ambientTimeMinutes", { m })
  }
  if (msAgo < DAY_MS) {
    const h = Math.max(1, Math.floor(msAgo / HOUR_MS))
    return t("shell.ambientTimeHours", { h })
  }
  const d = Math.max(1, Math.floor(msAgo / DAY_MS))
  return t("shell.ambientTimeDays", { d })
}
