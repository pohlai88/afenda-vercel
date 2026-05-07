import type { MetadataRoute } from "next"

import { DEFAULT_APP_LOCALE, toLocalePath } from "#lib/i18n/locales.shared"
import { getSiteUrl } from "#lib/site"

/** Only include indexable public URLs (omit auth/app shells with noindex). */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = getSiteUrl()
  const now = new Date()

  const home = `${base.replace(/\/$/, "")}${toLocalePath(DEFAULT_APP_LOCALE, "/")}`
  return [
    {
      url: home,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
  ]
}
