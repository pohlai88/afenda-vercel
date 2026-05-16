const PUBLIC_LYNX_MAX_DISPLAY_ERROR_CHARS = 160

export type PublicLynxErrorMessageKey =
  | "errors.rateLimit"
  | "errors.unavailable"
  | "errors.tooLong"
  | "errors.invalid"
  | "errors.searchUnavailable"
  | "errors.network"
  | "errors.aborted"
  | "errors.generic"

function isSafePublicLynxErrorMessage(message: string): boolean {
  const trimmed = message.trim()
  if (
    trimmed.length === 0 ||
    trimmed.length > PUBLIC_LYNX_MAX_DISPLAY_ERROR_CHARS
  ) {
    return false
  }
  if (/\n\s+at\s/.test(trimmed)) return false
  if (/\b(TypeError|ReferenceError|SyntaxError):/i.test(trimmed)) return false
  if (trimmed.includes("ECONNREFUSED") || trimmed.includes("ENOTFOUND")) {
    return false
  }
  return true
}

/** Maps transport/API errors to `AskLynx.*` message keys (use with `useTranslations('AskLynx')`). */
export function resolvePublicLynxChatErrorKey(
  error: Error
): PublicLynxErrorMessageKey {
  const message = error.message.toLowerCase()
  if (message.includes("429") || message.includes("too many requests")) {
    return "errors.rateLimit"
  }
  if (
    message.includes("503") ||
    message.includes("not configured") ||
    message.includes("could not start")
  ) {
    return "errors.unavailable"
  }
  if (message.includes("413") || message.includes("too large")) {
    return "errors.tooLong"
  }
  if (message.includes("400") || message.includes("invalid")) {
    return "errors.invalid"
  }
  if (message.includes("documentation search is temporarily unavailable")) {
    return "errors.searchUnavailable"
  }
  if (
    message.includes("failed to fetch") ||
    message.includes("network") ||
    message.includes("load failed")
  ) {
    return "errors.network"
  }
  if (message.includes("aborted") || message.includes("abort")) {
    return "errors.aborted"
  }
  if (isSafePublicLynxErrorMessage(error.message)) {
    return "errors.generic"
  }
  return "errors.generic"
}

/** @deprecated Prefer `resolvePublicLynxChatErrorKey` + `useTranslations('AskLynx')` in UI. */
export function formatPublicLynxChatError(error: Error): string {
  const key = resolvePublicLynxChatErrorKey(error)
  const english: Record<PublicLynxErrorMessageKey, string> = {
    "errors.rateLimit":
      "Too many questions in a short time. Please wait a minute and try again.",
    "errors.unavailable": "Ask Lynx is temporarily unavailable.",
    "errors.tooLong": "That message is too long. Shorten it and try again.",
    "errors.invalid":
      "That message could not be sent. Start a new chat and try again.",
    "errors.searchUnavailable":
      "Ask-docs search is temporarily unavailable. Try again in a moment.",
    "errors.network":
      "Could not reach Ask Lynx. Check your connection and try again.",
    "errors.aborted": "The response was stopped.",
    "errors.generic": "Something went wrong. Try again or start a new chat.",
  }
  return english[key]
}
