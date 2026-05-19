import "server-only"

import { cacheLife } from "next/cache"

import {
  buildOpenStatusFeedUrl,
  fallbackOpenStatusSnapshot,
  normalizeOpenStatusFeed,
  type OpenStatusPublicSnapshot,
} from "./openstatus-status.shared"

export async function getCachedOpenStatusPublicSnapshot(): Promise<OpenStatusPublicSnapshot> {
  "use cache"
  cacheLife({ revalidate: 60 })

  return resolveOpenStatusPublicSnapshot()
}

export async function resolveOpenStatusPublicSnapshot(): Promise<OpenStatusPublicSnapshot> {
  const publicStatusUrl = process.env.OPENSTATUS_PUBLIC_STATUS_URL?.trim()
  const feedUrl = buildOpenStatusFeedUrl(publicStatusUrl)

  if (!publicStatusUrl || !feedUrl) {
    return fallbackOpenStatusSnapshot({
      publicStatusUrl,
      feedUrl,
      reason: "missing-config",
    })
  }

  try {
    const response = await fetch(feedUrl, {
      headers: {
        Accept: "application/json",
        "User-Agent": "Afenda status wrapper",
      },
      next: { revalidate: 60 },
    })

    if (!response.ok) {
      return fallbackOpenStatusSnapshot({
        publicStatusUrl,
        feedUrl,
        reason: "fetch-failed",
      })
    }

    return normalizeOpenStatusFeed(await response.json(), {
      publicStatusUrl,
      feedUrl,
    })
  } catch {
    return fallbackOpenStatusSnapshot({
      publicStatusUrl,
      feedUrl,
      reason: "fetch-failed",
    })
  }
}
