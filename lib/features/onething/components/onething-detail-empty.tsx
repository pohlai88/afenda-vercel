"use client"

import { useTranslations } from "next-intl"

/**
 * Detail-pane empty state — single quiet line.
 *
 * The composer at the top of the list is the discovery surface; this empty
 * state never tries to teach. No tutorial chrome.
 */
export function OneThingDetailEmpty() {
  const t = useTranslations("Dashboard.OneThing")
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 px-6 py-16 text-center">
      <p className="text-base text-foreground">{t("shell.noFocusTitle")}</p>
      <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
        {t("shell.noFocusDescription")}
      </p>
    </div>
  )
}
