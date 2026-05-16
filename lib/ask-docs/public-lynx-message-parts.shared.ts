import type { Tool, UIToolInvocation } from "ai"

import type { ChatUIMessage } from "./public-lynx.shared"

export type PublicLynxSearchToolInvocation = UIToolInvocation<Tool>

const PUBLIC_LYNX_SEARCH_TOOL_NAME = "search" as const

/** Visible text for a message bubble or transcript (excludes client context parts). */
export function extractPublicLynxMessageText(
  parts: ChatUIMessage["parts"] | undefined
): string {
  if (!parts?.length) return ""
  return parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("")
}

/** Search tool invocations rendered in the assistant message list. */
export function extractPublicLynxSearchToolCalls(
  parts: ChatUIMessage["parts"] | undefined
): PublicLynxSearchToolInvocation[] {
  if (!parts?.length) return []

  const calls: PublicLynxSearchToolInvocation[] = []
  for (const part of parts) {
    if (!part.type.startsWith("tool-")) continue
    const toolName = part.type.slice("tool-".length)
    if (toolName !== PUBLIC_LYNX_SEARCH_TOOL_NAME) continue
    const invocation = part as PublicLynxSearchToolInvocation
    if (invocation.toolCallId) {
      calls.push(invocation)
    }
  }
  return calls
}
