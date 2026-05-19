import type { MessengerPanelTransport } from "#features/messenger/client"

import { SHELL_PREVIEW_ORG_ID } from "../../schemas/dev-paths.shared"

const PREVIEW_ROOM = "00000000-0000-0000-0000-000000000001"

export const SHELL_PREVIEW_MESSENGER_ORG_ID = SHELL_PREVIEW_ORG_ID

export function createShellPreviewMessengerTransport(): MessengerPanelTransport {
  return {
    listRooms: async () => ({
      ok: true,
      rooms: [
        {
          id: PREVIEW_ROOM,
          organizationId: SHELL_PREVIEW_ORG_ID,
          kind: "group",
          name: "Preview room",
          lastMessageAt: new Date().toISOString(),
          lastMessagePreview: "Stub message — realtime off in preview.",
        },
      ],
    }),
    listMessages: async () => ({
      ok: true,
      messages: [
        {
          id: "msg-preview-1",
          roomId: PREVIEW_ROOM,
          organizationId: SHELL_PREVIEW_ORG_ID,
          authorUserId: "user-preview",
          body: "Hello from shell preview (no database).",
          createdAt: new Date().toISOString(),
        },
      ],
    }),
    sendMessage: async (raw) => {
      const body =
        typeof raw === "object" &&
        raw !== null &&
        "body" in raw &&
        typeof (raw as { body?: unknown }).body === "string"
          ? (raw as { body: string }).body
          : "Preview send"
      return {
        ok: true,
        message: {
          id: `msg-preview-${Date.now()}`,
          roomId: PREVIEW_ROOM,
          organizationId: SHELL_PREVIEW_ORG_ID,
          authorUserId: "user-preview",
          body,
          createdAt: new Date().toISOString(),
        },
      }
    },
    createGroupRoom: async () => ({ ok: true, roomId: PREVIEW_ROOM }),
    markRead: async () => ({ ok: true }),
  }
}
