import { extractPublicLynxMessageText } from "./public-lynx-message-parts.shared"
import type { ChatUIMessage } from "./public-lynx.shared"

/** Markdown transcript of a Public Lynx thread for clipboard export. */
export function buildPublicLynxConversationTranscript(
  messages: ChatUIMessage[]
): string {
  return messages
    .filter((msg) => msg.role !== "system")
    .map((msg) => {
      const role = msg.role === "user" ? "You" : "Lynx"
      const trimmed = extractPublicLynxMessageText(msg.parts).trim()
      if (!trimmed) return null
      return `**${role}:**\n${trimmed}`
    })
    .filter((block): block is string => block !== null)
    .join("\n\n")
}
