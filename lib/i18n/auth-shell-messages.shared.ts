import type { AbstractIntlMessages } from "next-intl"

/**
 * Message namespaces needed under `app/[locale]/sign-in/*` (client subtree).
 * Keeps the nested `NextIntlClientProvider` aligned with actual `useTranslations` usage.
 */
const SIGN_IN_SHELL_KEYS = ["Auth", "AuthStatus"] as const

export function pickSignInShellMessages(
  messages: AbstractIntlMessages
): AbstractIntlMessages {
  const out: AbstractIntlMessages = {}
  for (const key of SIGN_IN_SHELL_KEYS) {
    const slice = messages[key as keyof AbstractIntlMessages]
    if (slice != null) {
      ;(out as Record<string, unknown>)[key] = slice
    }
  }
  return out
}
