"use client"

/**
 * Sign-out cleanup for OneThing's per-device client storage.
 *
 * The composer drafts (`afenda:onething:composer:*`) and the viewed-id LRU
 * (`afenda:onething:viewed`) live in `localStorage` only. They are never
 * shipped to the server, so they would otherwise survive sign-out and be
 * readable by the next operator on the same device.
 *
 * This is a privacy boundary, not a footprint optimization: composer drafts
 * may carry sensitive operational text ("Vendor X blocked because…"). The
 * canonical sign-out surface (`SignOutButton`) calls this synchronously
 * before `authClient.signOut()` so cleanup happens even if the network
 * request fails.
 *
 * Server-driven sign-out paths (e.g. `/account` form action) do not have
 * client-side context to clear localStorage; those operators are routed
 * through the topbar's `SignOutButton` whenever possible.
 */

const COMPOSER_PREFIX = "afenda:onething:composer:"
const VIEWED_KEY = "afenda:onething:viewed"

export function clearOneThingClientStorage(): void {
  if (typeof window === "undefined") return
  try {
    const storage = window.localStorage
    storage.removeItem(VIEWED_KEY)

    // Drafts use a `composer:<scope>:<listId>` prefix — collect first, then
    // remove. Iterating with `removeItem` mid-loop shifts the indices.
    const composerKeys: string[] = []
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i)
      if (key && key.startsWith(COMPOSER_PREFIX)) composerKeys.push(key)
    }
    for (const key of composerKeys) {
      storage.removeItem(key)
    }
  } catch {
    // best effort — quota / disabled storage / private mode
  }
}
