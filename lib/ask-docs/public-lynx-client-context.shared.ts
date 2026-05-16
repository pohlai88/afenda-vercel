import {
  DEFAULT_APP_LOCALE,
  ensureAppLocale,
  stripLeadingLocalePrefix,
  type AppLocale,
} from "#lib/i18n/locales.shared"

import type { ChatUIMessage } from "./public-lynx.shared"

/** Client-only location part attached to every Public Lynx user message. */
export function buildPublicLynxClientContextPart(): {
  type: "data-client"
  data: { location: string }
} {
  return {
    type: "data-client",
    data: {
      location: typeof window !== "undefined" ? window.location.href : "",
    },
  }
}

/** User message payload for `useChat().sendMessage` (locale context + text). */
export function buildPublicLynxUserMessage(text: string): {
  role: "user"
  parts: [
    ReturnType<typeof buildPublicLynxClientContextPart>,
    { type: "text"; text: string },
  ]
} {
  return {
    role: "user",
    parts: [buildPublicLynxClientContextPart(), { type: "text", text }],
  }
}

/** Resolves ask-docs locale from the browser location sent in `data-client` parts. */
export function resolveAskDocsLocaleFromMessages(
  messages: ChatUIMessage[]
): AppLocale {
  for (const message of messages) {
    for (const part of message.parts ?? []) {
      if (part.type !== "data-client") continue
      const location = part.data?.location
      if (typeof location !== "string") continue
      try {
        const pathname = new URL(location).pathname
        const stripped = stripLeadingLocalePrefix(pathname)
        if (stripped?.locale) {
          return ensureAppLocale(stripped.locale)
        }
      } catch {
        // Ignore malformed client context URLs.
      }
    }
  }
  return DEFAULT_APP_LOCALE
}
