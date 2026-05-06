import type { MetadataRoute } from "next"

import { getSiteUrl } from "#lib/site"

/** Only include indexable public URLs (omit auth/app shells with noindex). */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = getSiteUrl()
  const now = new Date()

  return [
    {
      url: base,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
  ]
}
